# Unit tests. Run with:  opa test policies -v
package azure.audit_test

import data.azure.audit

# A fully compliant storage account. Each test breaks one thing.
good := {
	"name": "stgtest",
	"type": "Microsoft.Storage/storageAccounts",
	"tags": {"Owner": "platform-team", "Environment": "prod"},
	"properties": {
		"supportsHttpsTrafficOnly": true,
		"minimumTlsVersion": "TLS1_2",
		"allowBlobPublicAccess": false,
		"publicNetworkAccess": "Disabled",
		"networkAcls": {"defaultAction": "Deny"},
		"keyCreationTime": {"key1": "2026-10-01T00:00:00Z", "key2": "2026-10-01T00:00:00Z"},
		"defaultToOAuthAuthentication": true,
	},
}

# Freeze "now" at 2026-10-20 so key-age tests never go stale.
fixed_now := time.parse_rfc3339_ns("2026-10-20T00:00:00Z")

# Returns the set of policy IDs that fired for a given resource.
ids_for(resource) := ids if {
	ids := {v.policy_id | some v in audit.violations} with input as resource with time.now_ns as fixed_now
}

test_good_resource_is_compliant if {
	audit.compliant with input as good with time.now_ns as fixed_now
}

test_01_missing_tags if {
	ids_for(json.patch(good, [{"op": "replace", "path": "/tags", "value": {}}])) == {"01"}
}

test_01_blank_tag_value if {
	ids_for(json.patch(good, [{"op": "replace", "path": "/tags/Owner", "value": "  "}])) == {"01"}
}

test_02_http_allowed if {
	ids_for(json.patch(good, [{"op": "replace", "path": "/properties/supportsHttpsTrafficOnly", "value": false}])) == {"02"}
}

test_02_field_missing if {
	ids_for(json.patch(good, [{"op": "remove", "path": "/properties/supportsHttpsTrafficOnly"}])) == {"02"}
}

test_03_old_tls if {
	ids_for(json.patch(good, [{"op": "replace", "path": "/properties/minimumTlsVersion", "value": "TLS1_0"}])) == {"03"}
}

test_03_field_missing if {
	ids_for(json.patch(good, [{"op": "remove", "path": "/properties/minimumTlsVersion"}])) == {"03"}
}

test_04_public_blobs if {
	ids_for(json.patch(good, [{"op": "replace", "path": "/properties/allowBlobPublicAccess", "value": true}])) == {"04"}
}

test_05_open_network if {
	ids_for(json.patch(good, [
		{"op": "replace", "path": "/properties/publicNetworkAccess", "value": "Enabled"},
		{"op": "replace", "path": "/properties/networkAcls/defaultAction", "value": "Allow"},
	])) == {"05"}
}

test_05_public_disabled_is_enough if {
	ids_for(json.patch(good, [{"op": "replace", "path": "/properties/networkAcls/defaultAction", "value": "Allow"}])) == set()
}

test_06_old_key if {
	ids_for(json.patch(good, [{"op": "replace", "path": "/properties/keyCreationTime/key2", "value": "2024-02-28T12:04:27.3840805Z"}])) == {"06"}
}

test_07_portal_uses_keys if {
	ids_for(json.patch(good, [{"op": "replace", "path": "/properties/defaultToOAuthAuthentication", "value": false}])) == {"07"}
}

test_storage_rules_skip_other_types if {
	ids_for(json.patch(good, [
		{"op": "replace", "path": "/type", "value": "Microsoft.Web/sites"},
		{"op": "replace", "path": "/properties", "value": {}},
	])) == set()
}
