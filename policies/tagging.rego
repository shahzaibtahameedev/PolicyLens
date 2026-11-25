# Policy 01: tagging rules. Applies to every resource type.
package azure.audit

# The tags every resource must carry.
required_tags := {"Owner", "Environment"}

# A tag counts as present only if it exists AND has a non-blank value.
has_tag(name) if trim_space(input.tags[name]) != ""

# Policy 01: Every resource must have Owner and Environment tags.
violations contains v if {
	missing := {tag | some tag in required_tags; not has_tag(tag)}
	count(missing) > 0

	v := {
		"policy_id": "01",
		"severity": "Medium",
		"resource": input.name,
		"resource_type": input.type,
		"field": "tags",
		"actual": object.get(input, "tags", null),
		"message": sprintf("Missing required tags: %v", [concat(", ", sort(missing))]),
	}
}
