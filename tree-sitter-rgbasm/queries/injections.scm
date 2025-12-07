; Inject the internal grammar into identifiers to parse their structure
((identifier) @injection.content
 (#set! injection.language "rgbasm_identifier"))

; ((variable) @injection.content
;  (#set! injection.language "rgbasm_identifier"))
