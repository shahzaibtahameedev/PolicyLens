# Policies 02-07: security baseline for storage accounts.
package azure.audit

# These rules only apply when the resource is a storage account.
is_storage if input.type == "Microsoft.Storage/storageAccounts"

# Shortcut so rules can write props.x instead of input.properties.x
props := object.get(input, "properties", {})

# Policy 02: Storage accounts must accept HTTPS traffic only.
violations contains v if {
	is_storage
	not props.supportsHttpsTrafficOnly == true

	v := {
		"policy_id": "02",
		"severity": "High",
		"resource": input.name,
		"resource_type": input.type,
		"field": "properties.supportsHttpsTrafficOnly",
		"actual": object.get(props, "supportsHttpsTrafficOnly", null),
		"message": "Storage account accepts plain HTTP traffic",
	}
}

# Policy 03: Storage accounts must require TLS 1.2 or higher.
allowed_tls := {"TLS1_2", "TLS1_3"}

# Helper rule: true only when the TLS field exists AND is in the allowed set.
tls_ok if props.minimumTlsVersion in allowed_tls

violations contains v if {
	is_storage
	not tls_ok

	v := {
		"policy_id": "03",
		"severity": "High",
		"resource": input.name,
		"resource_type": input.type,
		"field": "properties.minimumTlsVersion",
		"actual": object.get(props, "minimumTlsVersion", null),
		"message": "Minimum TLS version is below 1.2 or not set",
	}
}

# Policy 04: Anonymous public access to blobs must be disabled.
violations contains v if {
	is_storage
	not props.allowBlobPublicAccess == false

	v := {
		"policy_id": "04",
		"severity": "High",
		"resource": input.name,
		"resource_type": input.type,
		"field": "properties.allowBlobPublicAccess",
		"actual": object.get(props, "allowBlobPublicAccess", null),
		"message": "Containers in this account are allowed to be made public",
	}
}

# Policy 05: Network access must be denied by default.
# Two rule bodies with the same name = OR. Either one makes it restricted.
network_restricted if props.publicNetworkAccess == "Disabled"

network_restricted if props.networkAcls.defaultAction == "Deny"

violations contains v if {
	is_storage
	not network_restricted

	v := {
		"policy_id": "05",
		"severity": "High",
		"resource": input.name,
		"resource_type": input.type,
		"field": "properties.networkAcls.defaultAction, properties.publicNetworkAccess",
		"actual": {
			"publicNetworkAccess": object.get(props, "publicNetworkAccess", null),
			"defaultAction": object.get(props, ["networkAcls", "defaultAction"], null),
		},
		"message": "Account is reachable from any network",
	}
}

# Policy 06: Access keys must be rotated at least every 90 days.
max_key_age_ns := (((90 * 24) * 60) * 60) * 1000000000

stale_keys contains key if {
	some key, created in props.keyCreationTime
	created != null
	time.now_ns() - time.parse_rfc3339_ns(created) > max_key_age_ns
}

violations contains v if {
	is_storage
	count(stale_keys) > 0

	v := {
		"policy_id": "06",
		"severity": "Medium",
		"resource": input.name,
		"resource_type": input.type,
		"field": "properties.keyCreationTime",
		"actual": object.get(props, "keyCreationTime", null),
		"message": sprintf("Keys not rotated in over 90 days: %v", [concat(", ", sort(stale_keys))]),
	}
}

# Policy 07: The portal should default to Entra ID authentication.
violations contains v if {
	is_storage
	not props.defaultToOAuthAuthentication == true

	v := {
		"policy_id": "07",
		"severity": "Low",
		"resource": input.name,
		"resource_type": input.type,
		"field": "properties.defaultToOAuthAuthentication",
		"actual": object.get(props, "defaultToOAuthAuthentication", null),
		"message": "Portal uses access keys instead of Entra ID by default",
	}
}

# Overall verdict for the resource.
default compliant := false

compliant if count(violations) == 0
