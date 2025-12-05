; ==============================================================================
; Labels and Label Blocks
; ==============================================================================

; Global label names - exported (::)
((global_label_block
  (global_identifier) @module.builtin
  "::" @punctuation.bracket.label.export))

; Global label names - non-exported (:)
((global_label_block
  (global_identifier) @module
  ":" @punctuation.bracket.label))

; Local label names (includes both .local and Parent.local forms)
((local_label_block
  [(local_identifier) (qualified_identifier)] @label))

(local_label_block ":" @punctuation.bracket)

(qualified_identifier "." @punctuation.delimiter)

(local_identifier "." @punctuation.delimiter) @label

; Anonymous labels
(anonymous_label) @label

(uniqueness_affix) @punctuation.special

(_
  raw_marker: _ @punctuation.delimiter)


; ==============================================================================
; Variables and Identifiers
; ==============================================================================

(anonymous_label_ref) @label

(expression 
  (identifier
    (global_identifier
      [(symbol) (raw_symbol)] @constant
        (#set! priority 105)))
        (#any-of? @constant
         ; WARN: script-generated content. Do not edit directly.
         "ACCLATCH0_START" "ACCLATCH1_FINISH" "AUD1ENV_DIR" "AUD1ENV_DOWN" "AUD1ENV_INIT_VOLUME" "AUD1ENV_PACE" "AUD1ENV_UP" "AUD1HIGH_LENGTH_OFF" "AUD1HIGH_LENGTH_ON" "AUD1HIGH_PERIOD_HIGH" "AUD1HIGH_RESTART" "AUD1LEN_DUTY" "AUD1LEN_DUTY_12_5"
         "AUD1LEN_DUTY_25" "AUD1LEN_DUTY_50" "AUD1LEN_DUTY_75" "AUD1LEN_TIMER" "AUD1RAM" "AUD1SWEEP_DIR" "AUD1SWEEP_DOWN" "AUD1SWEEP_SHIFT" "AUD1SWEEP_TIME" "AUD1SWEEP_UP" "AUD2ENV_DIR" "AUD2ENV_DOWN" "AUD2ENV_INIT_VOLUME" "AUD2ENV_PACE" "AUD2ENV_UP"
         "AUD2HIGH_LENGTH_OFF" "AUD2HIGH_LENGTH_ON" "AUD2HIGH_PERIOD_HIGH" "AUD2HIGH_RESTART" "AUD2LEN_DUTY" "AUD2LEN_DUTY_12_5" "AUD2LEN_DUTY_25" "AUD2LEN_DUTY_50" "AUD2LEN_DUTY_75" "AUD2LEN_TIMER" "AUD2RAM" "AUD3ENA_OFF" "AUD3ENA_ON"
         "AUD3HIGH_LENGTH_OFF" "AUD3HIGH_LENGTH_ON" "AUD3HIGH_PERIOD_HIGH" "AUD3HIGH_RESTART" "AUD3LEVEL_100" "AUD3LEVEL_25" "AUD3LEVEL_50" "AUD3LEVEL_MUTE" "AUD3LEVEL_VOLUME" "AUD3RAM" "AUD3WAVE_SIZE" "AUD4ENV_DIR" "AUD4ENV_DOWN" "AUD4ENV_INIT_VOLUME"
         "AUD4ENV_PACE" "AUD4ENV_UP" "AUD4GO_LENGTH_OFF" "AUD4GO_LENGTH_ON" "AUD4GO_RESTART" "AUD4LEN_TIMER" "AUD4POLY_15STEP" "AUD4POLY_7STEP" "AUD4POLY_DIV" "AUD4POLY_SHIFT" "AUD4RAM" "AUDENA_CH1_OFF" "AUDENA_CH1_ON" "AUDENA_CH2_OFF" "AUDENA_CH2_ON"
         "AUDENA_CH3_OFF" "AUDENA_CH3_ON" "AUDENA_CH4_OFF" "AUDENA_CH4_ON" "AUDENA_OFF" "AUDENA_ON" "AUDRAM_SIZE" "AUDTERM_1_LEFT" "AUDTERM_1_RIGHT" "AUDTERM_2_LEFT" "AUDTERM_2_RIGHT" "AUDTERM_3_LEFT" "AUDTERM_3_RIGHT" "AUDTERM_4_LEFT" "AUDTERM_4_RIGHT"
         "AUDVOL_LEFT" "AUDVOL_RIGHT" "AUDVOL_VIN_LEFT" "AUDVOL_VIN_RIGHT" "BANK_OFF" "BANK_ON" "BGPI_AUTOINC" "BGPI_INDEX" "BGP_SGB_TRANSFER" "BG_BANK0" "BG_BANK1" "BG_PALETTE" "BG_PRIO" "BG_XFLIP" "BG_YFLIP" "BMODE_ADVANCED" "BMODE_SIMPLE"
         "BOOTUP_A_CGB" "BOOTUP_A_DMG" "BOOTUP_A_MGB" "BOOTUP_A_SGB" "BOOTUP_A_SGB2" "BOOTUP_B_AGB" "BOOTUP_B_CGB" "BOOTUP_C_CGB" "BOOTUP_C_DMG" "BOOTUP_C_SGB" "BOOTUP_D_COLOR" "BOOTUP_D_MONO" "BOOTUP_E_CGB" "BOOTUP_E_CGB_DMGMODE" "BOOTUP_E_DMG"
         "BOOTUP_E_DMG0" "BOOTUP_E_SGB" "B_AUD1ENV_DIR" "B_AUD1HIGH_LEN_ENABLE" "B_AUD1HIGH_RESTART" "B_AUD1SWEEP_DIR" "B_AUD2ENV_DIR" "B_AUD2HIGH_LEN_ENABLE" "B_AUD2HIGH_RESTART" "B_AUD3ENA_ENABLE" "B_AUD3HIGH_LEN_ENABLE" "B_AUD3HIGH_RESTART"
         "B_AUD4ENV_DIR" "B_AUD4GO_LEN_ENABLE" "B_AUD4GO_RESTART" "B_AUD4POLY_WIDTH" "B_AUDENA_ENABLE" "B_AUDENA_ENABLE_CH1" "B_AUDENA_ENABLE_CH2" "B_AUDENA_ENABLE_CH3" "B_AUDENA_ENABLE_CH4" "B_AUDTERM_1_LEFT" "B_AUDTERM_1_RIGHT" "B_AUDTERM_2_LEFT"
         "B_AUDTERM_2_RIGHT" "B_AUDTERM_3_LEFT" "B_AUDTERM_3_RIGHT" "B_AUDTERM_4_LEFT" "B_AUDTERM_4_RIGHT" "B_AUDVOL_VIN_LEFT" "B_AUDVOL_VIN_RIGHT" "B_BANK_ON" "B_BGPI_AUTOINC" "B_BG_BANK1" "B_BG_PRIO" "B_BG_XFLIP" "B_BG_YFLIP" "B_BOOTUP_B_AGB"
         "B_COLOR_BLUE" "B_COLOR_GREEN" "B_COLOR_RED" "B_IE_JOYPAD" "B_IE_SERIAL" "B_IE_STAT" "B_IE_TIMER" "B_IE_VBLANK" "B_IF_JOYPAD" "B_IF_SERIAL" "B_IF_STAT" "B_IF_TIMER" "B_IF_VBLANK" "B_JOYP_A" "B_JOYP_B" "B_JOYP_DOWN" "B_JOYP_GET_BUTTONS"
         "B_JOYP_GET_CTRL_PAD" "B_JOYP_LEFT" "B_JOYP_RIGHT" "B_JOYP_SELECT" "B_JOYP_SGB_ONE" "B_JOYP_SGB_ZERO" "B_JOYP_START" "B_JOYP_UP" "B_LCDC_BG" "B_LCDC_BG_MAP" "B_LCDC_BLOCKS" "B_LCDC_ENABLE" "B_LCDC_OBJS" "B_LCDC_OBJ_SIZE" "B_LCDC_PRIO"
         "B_LCDC_WINDOW" "B_LCDC_WIN_MAP" "B_OAM_BANK1" "B_OAM_PAL1" "B_OAM_PRIO" "B_OAM_XFLIP" "B_OAM_YFLIP" "B_OBPI_AUTOINC" "B_OPRI_PRIORITY" "B_PAD_A" "B_PAD_B" "B_PAD_DOWN" "B_PAD_LEFT" "B_PAD_RIGHT" "B_PAD_SELECT" "B_PAD_START" "B_PAD_SWAP_A"
         "B_PAD_SWAP_B" "B_PAD_SWAP_DOWN" "B_PAD_SWAP_LEFT" "B_PAD_SWAP_RIGHT" "B_PAD_SWAP_SELECT" "B_PAD_SWAP_START" "B_PAD_SWAP_UP" "B_PAD_UP" "B_RAMB_RTC_DH_CARRY" "B_RAMB_RTC_DH_HALT" "B_RAMB_RTC_DH_HIGH" "B_RAMB_RUMBLE" "B_RP_DATA_IN" "B_RP_LED_ON"
         "B_SC_SOURCE" "B_SC_SPEED" "B_SC_START" "B_SPD_DOUBLE" "B_SPD_PREPARE" "B_STAT_BUSY" "B_STAT_LYC" "B_STAT_LYCF" "B_STAT_MODE_0" "B_STAT_MODE_1" "B_STAT_MODE_2" "B_TAC_START" "B_VDMA_LEN_BUSY" "B_VDMA_LEN_MODE" "COLOR_BLUE" "COLOR_CH_MAX"
         "COLOR_CH_WIDTH" "COLOR_GREEN_HIGH" "COLOR_GREEN_LOW" "COLOR_RED" "COLOR_SIZE" "HARDWARE_INC" "HARDWARE_INC_VERSION" "IE_JOYPAD" "IE_SERIAL" "IE_STAT" "IE_TIMER" "IE_VBLANK" "IF_JOYPAD" "IF_SERIAL" "IF_STAT" "IF_TIMER" "IF_VBLANK"
         "INT_HANDLER_JOYPAD" "INT_HANDLER_SERIAL" "INT_HANDLER_STAT" "INT_HANDLER_TIMER" "INT_HANDLER_VBLANK" "IR_LED_OFF" "IR_LED_ON" "JOYP_A" "JOYP_B" "JOYP_DOWN" "JOYP_GET" "JOYP_GET_BUTTONS" "JOYP_GET_CTRL_PAD" "JOYP_GET_NONE" "JOYP_INPUTS"
         "JOYP_LEFT" "JOYP_RIGHT" "JOYP_SELECT" "JOYP_SGB_FINISH" "JOYP_SGB_ONE" "JOYP_SGB_START" "JOYP_SGB_ZERO" "JOYP_START" "JOYP_UP" "LCDC_BG" "LCDC_BG_9800" "LCDC_BG_9C00" "LCDC_BG_MAP" "LCDC_BG_OFF" "LCDC_BG_ON" "LCDC_BLOCK01" "LCDC_BLOCK21"
         "LCDC_BLOCKS" "LCDC_ENABLE" "LCDC_OBJS" "LCDC_OBJ_16" "LCDC_OBJ_8" "LCDC_OBJ_OFF" "LCDC_OBJ_ON" "LCDC_OBJ_SIZE" "LCDC_OFF" "LCDC_ON" "LCDC_PRIO" "LCDC_PRIO_OFF" "LCDC_PRIO_ON" "LCDC_WINDOW" "LCDC_WIN_9800" "LCDC_WIN_9C00" "LCDC_WIN_MAP"
         "LCDC_WIN_OFF" "LCDC_WIN_ON" "LY_VBLANK" "OAMA_FLAGS" "OAMA_TILEID" "OAMA_X" "OAMA_Y" "OAM_BANK0" "OAM_BANK1" "OAM_COUNT" "OAM_PAL0" "OAM_PAL1" "OAM_PALETTE" "OAM_PRIO" "OAM_SIZE" "OAM_XFLIP" "OAM_X_OFS" "OAM_YFLIP" "OAM_Y_OFS" "OBJ_SIZE"
         "OBPI_AUTOINC" "OBPI_INDEX" "OPRI_COORD" "OPRI_OAM" "OPRI_PRIORITY" "PAD_A" "PAD_B" "PAD_BUTTONS" "PAD_CTRL_PAD" "PAD_DOWN" "PAD_LEFT" "PAD_RIGHT" "PAD_SELECT" "PAD_START" "PAD_SWAP_A" "PAD_SWAP_B" "PAD_SWAP_BUTTONS" "PAD_SWAP_CTRL_PAD"
         "PAD_SWAP_DOWN" "PAD_SWAP_LEFT" "PAD_SWAP_RIGHT" "PAD_SWAP_SELECT" "PAD_SWAP_START" "PAD_SWAP_UP" "PAD_UP" "PAL_COLORS" "PAL_SIZE" "PCM12_CH1" "PCM12_CH2" "PCM34_CH3" "PCM34_CH4" "RAMB_RTC_DH" "RAMB_RTC_DH_CARRY" "RAMB_RTC_DH_HALT"
         "RAMB_RTC_DH_HIGH" "RAMB_RTC_DL" "RAMB_RTC_H" "RAMB_RTC_M" "RAMB_RTC_S" "RAMB_RUMBLE" "RAMB_RUMBLE_OFF" "RAMB_RUMBLE_ON" "RAMG_CART_RAM" "RAMG_CART_RAM_RO" "RAMG_IR" "RAMG_RTC_IN" "RAMG_RTC_IN_ARG" "RAMG_RTC_IN_CMD" "RAMG_RTC_OUT"
         "RAMG_RTC_OUT_CMD" "RAMG_RTC_OUT_RESULT" "RAMG_RTC_SEMAPHORE" "RAMG_SRAM_DISABLE" "RAMG_SRAM_ENABLE" "RAMREG_ENABLE" "RP_DATA_IN" "RP_DISABLE" "RP_ENABLE" "RP_LED_ON" "RP_READ" "RP_WRITE_HIGH" "RP_WRITE_LOW" "RTCLATCH_FINISH" "RTCLATCH_START"
         "SCREEN_AREA" "SCREEN_HEIGHT" "SCREEN_HEIGHT_PX" "SCREEN_WIDTH" "SCREEN_WIDTH_PX" "SC_EXTERNAL" "SC_FAST" "SC_INTERNAL" "SC_SLOW" "SC_SOURCE" "SC_SPEED" "SC_START" "SHADE_BLACK" "SHADE_DARK" "SHADE_LIGHT" "SHADE_WHITE" "SPD_DOUBLE" "SPD_PREPARE"
         "SPD_SINGLE" "STAT_BUSY" "STAT_HBLANK" "STAT_LCD" "STAT_LYC" "STAT_LYCF" "STAT_MODE" "STAT_MODE_0" "STAT_MODE_1" "STAT_MODE_2" "STAT_OAM" "STAT_VBLANK" "SYS_CGB" "SYS_DMG" "SYS_MODE" "SYS_PGB1" "SYS_PGB2" "TAC_16KHZ" "TAC_262KHZ" "TAC_4KHZ"
         "TAC_65KHZ" "TAC_CLOCK" "TAC_START" "TAC_STOP" "TILEMAP0" "TILEMAP1" "TILEMAP_AREA" "TILEMAP_HEIGHT" "TILEMAP_HEIGHT_PX" "TILEMAP_WIDTH" "TILEMAP_WIDTH_PX" "TILE_HEIGHT" "TILE_SIZE" "TILE_WIDTH" "VBK_BANK" "VDMA_LEN_BUSY" "VDMA_LEN_MODE"
         "VDMA_LEN_MODE_GENERAL" "VDMA_LEN_MODE_HBLANK" "VDMA_LEN_NO" "VDMA_LEN_SIZE" "VDMA_LEN_YES" "WBK_BANK" "WX_OFS" "_AUD3WAVERAM" "rACCELX0" "rACCELX1" "rACCELY0" "rACCELY1" "rACCLATCH0" "rACCLATCH1" "rAUD1ENV" "rAUD1HIGH" "rAUD1LEN" "rAUD1LOW"
         "rAUD1SWEEP" "rAUD2ENV" "rAUD2HIGH" "rAUD2LEN" "rAUD2LOW" "rAUD3ENA" "rAUD3HIGH" "rAUD3LEN" "rAUD3LEVEL" "rAUD3LOW" "rAUD3WAVE_0" "rAUD3WAVE_1" "rAUD3WAVE_2" "rAUD3WAVE_3" "rAUD3WAVE_4" "rAUD3WAVE_5" "rAUD3WAVE_6" "rAUD3WAVE_7" "rAUD3WAVE_8"
         "rAUD3WAVE_9" "rAUD3WAVE_A" "rAUD3WAVE_B" "rAUD3WAVE_C" "rAUD3WAVE_D" "rAUD3WAVE_E" "rAUD3WAVE_F" "rAUD4ENV" "rAUD4GO" "rAUD4LEN" "rAUD4POLY" "rAUDENA" "rAUDTERM" "rAUDVOL" "rBANK" "rBCPD" "rBCPS" "rBGP" "rBGPD" "rBGPI" "rBMODE" "rDIV" "rDMA"
         "rEEPROM" "rFLASH" "rFLASHA" "rFLASHB" "rFMODE" "rHDMA1" "rHDMA2" "rHDMA3" "rHDMA4" "rHDMA5" "rIE" "rIF" "rIRREG" "rJOYP" "rKEY0" "rKEY1" "rLCDC" "rLY" "rLYC" "rNR10" "rNR11" "rNR12" "rNR13" "rNR14" "rNR21" "rNR22" "rNR23" "rNR24" "rNR30" "rNR31"
         "rNR32" "rNR33" "rNR34" "rNR41" "rNR42" "rNR43" "rNR44" "rNR50" "rNR51" "rNR52" "rOBP0" "rOBP1" "rOBPD" "rOBPI" "rOCPD" "rOCPS" "rOPRI" "rP1" "rPCM12" "rPCM34" "rRAMB" "rRAMBA" "rRAMBB" "rRAMG" "rRAMREG" "rROM2B" "rROMB" "rROMB0" "rROMB1"
         "rROMBA" "rROMBB" "rRP" "rRTCLATCH" "rRTCREG" "rSB" "rSC" "rSCX" "rSCY" "rSPD" "rSTAT" "rSVBK" "rSYS" "rTAC" "rTIMA" "rTMA" "rVBK" "rVDMA_DEST_HIGH" "rVDMA_DEST_LOW" "rVDMA_LEN" "rVDMA_SRC_HIGH" "rVDMA_SRC_LOW" "rWBK" "rWX" "rWY"
         ; END WARN
        ))

(expression 
  (identifier
    (global_identifier
      [(symbol) (raw_symbol)] @variable)))


; ==============================================================================
; Instructions
; ==============================================================================

; We do not highlight this to have less color noise in the editor
(instruction
  mnemonic: (instruction_name) @function.call)

(register) @variable.builtin

(condition_code) @keyword.conditional

; ==============================================================================
; Directives - Control Flow
; ==============================================================================

(if_block
  keyword: (directive_keyword) @keyword.conditional
  end: (directive_keyword) @keyword.conditional)

(elif_clause
  (directive_keyword) @keyword.conditional)

(else_clause
  (directive_keyword) @keyword.conditional)

(rept_block
  keyword: (directive_keyword) @keyword.repeat
  end: (directive_keyword) @keyword.repeat)

(for_block
  (directive_keyword) @keyword.repeat)

; ==============================================================================
; Directives - Definitions and Declarations
; ==============================================================================

(def_directive
  keyword: (directive_keyword) @keyword.directive.define
  name: (global_identifier) @variable)

(def_directive
  assign_type: (directive_keyword) @keyword.modifier)  ; EQU, EQUS, RB, RW, RL

(def_directive
  assign_type: ["=" "+=" "-=" "*=" "/=" "%=" "<<=" ">>=" "&=" "|=" "^="] @operator)

; ==============================================================================
; Directives - Sections and Blocks
; ==============================================================================

(section_directive
  keyword: (directive_keyword) @markup.heading)

(section_directive
  fragment: (directive_keyword) @keyword.modifier)

(section_directive
  union: (directive_keyword) @keyword.modifier)

; ENDSECTION keyword
(section_block
  (directive_keyword) @markup.heading)

(section_type) @type

(bank_option
  "BANK" @keyword.modifier)

(align_option
  "ALIGN" @keyword.modifier
  align: (_) @attribute.builtin
  offset: (_)? @attribute.builtin)

(load_block
  keyword: (directive_keyword) @markup.heading
  fragment: _? @keyword.modifier
  union: _? @keyword.modifier
  end: (directive_keyword) @markup.heading)

(pushs_block
  keyword: (directive_keyword) @markup.heading
  end: (directive_keyword) @markup.heading)

(union_block
  keyword: (directive_keyword) @keyword.directive
  end: (directive_keyword) @keyword.directive)

(nextu_block
  keyword: (directive_keyword) @keyword.directive)

; ==============================================================================
; Directives - Options
; ==============================================================================

(opt_directive
  keyword: (directive_keyword) @keyword.directive)

(opt_arg) @string.special

(pusho_directive
  keyword: (directive_keyword) @keyword.directive)

(popo_directive
  keyword: (directive_keyword) @keyword.directive)

; ==============================================================================
; Directives - Assertions and Misc
; ==============================================================================

(assert_directive
  keyword: (directive_keyword) @keyword.directive)

(severity) @keyword.modifier

(export_directive
  keyword: (directive_keyword) @keyword.directive)

(ds_directive
  keyword: (directive_keyword) @keyword.directive)

(simple_directive
  keyword: (directive_keyword) @keyword.directive)

; Include directive keyword as preprocessor
(include_directive
  keyword: (directive_keyword) @keyword.directive.include)

; Include paths
((simple_directive
   keyword: (directive_keyword) @_kw
   (argument_list (expression (string_literal) @string.special)))
  (#any-of? @_kw "INCBIN"))

; ==============================================================================
; Macros
; ==============================================================================

(macro_definition
  keyword: (directive_keyword) @keyword.directive.define
  end: (directive_keyword) @keyword.directive.define)

(macro_definition
  name: (expression 
          ; Identifier inside expression are also highlighted as variables,
          ; so we set a higher priority
          (identifier) @function.macro (#set! priority 105)))

; Macro invocations - global identifier nodes
(macro_invocation
  (global_identifier) @function.macro)

; Macro arguments and unique affix
(macro_argument) @variable.parameter
(macro_arguments_spread) @variable.parameter

; ==============================================================================
; Functions
; ==============================================================================

; Standard function calls
(function_call
  (function_name) @function.builtin)

; Special functions with section type arguments
(startof_function
  (function_name) @function.builtin)

(sizeof_function
  (function_name) @function.builtin)

; ==============================================================================
; Constants and Built-ins
; ==============================================================================

(constant) @constant.builtin

; ==============================================================================
; Literals
; ==============================================================================

; Fixed-point must come before general numbers
((number_literal) @number.float
  (#match? @number.float "\\.[0-9]"))

(number_literal) @number
(graphics_literal) @number
(char_literal) @character

; ==============================================================================
; Strings and Interpolation
; ==============================================================================

(string_literal) @string
(raw_string_literal) @string

(interpolation
  "{" @punctuation.special
  "}" @punctuation.special)

(interpolation
  format: (format_spec) @string.special.symbol)

(format_spec ":" @punctuation.delimiter)

; Interpolation content highlighting
(interpolation
  [(symbol) (raw_symbol)] @variable)

; Symbols in interpolated identifiers are handled by the interpolation patterns above
; (The _interpolated_* nodes are internal and can't be queried directly)

; ==============================================================================
; Comments
; ==============================================================================

[
  (block_comment)
  (inline_comment)
] @comment @spell

; ==============================================================================
; Operators and Punctuation
; ==============================================================================

[
  "+" "-" "*" "/" "%"
  "<<" ">>" ">>>"
  "&" "|" "^" "~" "!"
  "**"
  "==" "!=" "===" "!=="
  "<=" ">=" "<" ">"
  "++"
  "&&" "||"
] @operator

["(" ")" "[" "]"] @punctuation.bracket
[","] @punctuation.delimiter

; Instruction separator
"::" @punctuation.delimiter

; Quiet token for suppressing error backtraces
(quiet) @punctuation.special

(line_continuation char: _ @punctuation.bracket)

; ==============================================================================
; Fragment Literals
; ==============================================================================

(fragment_literal) @punctuation.bracket
