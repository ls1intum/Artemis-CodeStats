// Targets follow the Bootstrap → TUM UI/Tailwind quick reference in Artemis's client-development
// guideline. Mechanical conversions are spelled out per token; component families name the kit
// component; tokens the rule only bans by prefix that Bootstrap itself never shipped are marked
// as custom classes to rename.

const state = 'danger|success|warning|info'
const breakpoints = 'sm|md|lg|xl|xxl'
const bp = (b: string) => (b === 'xxl' ? '2xl' : b)

// Exact Bootstrap class names within the families the rule bans by prefix.
const bootstrapExact = [
  /^btn(-(primary|secondary|success|danger|warning|info|light|dark|link|sm|lg|close|check|group|group-sm|group-lg|group-vertical|toolbar|outline-(primary|secondary|success|danger|warning|info|light|dark)))?$/,
  /^card(-(body|title|subtitle|text|link|header|footer|img|img-top|img-bottom|img-overlay|group|header-tabs|header-pills))?$/,
  /^alert(-(primary|secondary|success|danger|warning|info|light|dark|link|heading|dismissible))?$/,
  /^list-group(-(item|flush|numbered|horizontal|item-action|item-(primary|secondary|success|danger|warning|info|light|dark)|horizontal-(sm|md|lg|xl|xxl)))?$/,
  /^nav(-(link|item|tabs|pills|fill|justified|underline))?$/,
  /^navbar(-(brand|nav|text|toggler|toggler-icon|collapse|expand|expand-(sm|md|lg|xl|xxl)|light|dark))?$/,
  /^dropdown(-(menu|menu-end|menu-start|item|item-text|toggle|toggle-split|divider|header|center|menu-dark))?$/,
  /^modal(-(dialog|dialog-centered|dialog-scrollable|content|header|body|footer|title|sm|lg|xl|fullscreen|backdrop|open|static))?$/,
  /^breadcrumb(-item)?$/,
  /^(pagination|pagination-sm|pagination-lg|page-link|page-item)$/,
  /^toast(-(header|body|container))?$/,
  /^popover(-(header|body|arrow))?$/,
  /^accordion(-(item|header|button|body|collapse|flush))?$/,
  /^spinner-(border|grow)(-sm)?$/,
  /^offcanvas(-(header|title|body|start|end|top|bottom|backdrop))?$/,
  /^carousel(-(inner|item|control-prev|control-next|indicators|caption|fade|dark))?$/,
  /^input-group(-(text|sm|lg))?$/,
  /^table(-(striped|striped-columns|bordered|borderless|hover|active|sm|responsive|group-divider|responsive-(sm|md|lg|xl|xxl)|primary|secondary|success|danger|warning|info|light|dark))?$/,
  /^form-(control|control-sm|control-lg|control-plaintext|control-color|select|select-sm|select-lg|group|label|text|range|floating|check|check-input|check-label|check-reverse|check-inline|switch)$/,
  /^col-form-label(-sm|-lg)?$/,
  /^(valid|invalid)-feedback$/,
  /^(close|btn-close|btn-close-white)$/,
  /^visually-hidden(-focusable)?$/,
  /^text-truncate$/,
]
const familyPrefix =
  /^(btn|card|alert|list-group|nav|navbar|dropdown|modal|breadcrumb|toast|popover|accordion|offcanvas|carousel|input-group|table)(-|$)/

export const isCustomClass = (token: string) =>
  familyPrefix.test(token) && !bootstrapExact.some((re) => re.test(token))

const exact: [RegExp, (m: RegExpExecArray) => string][] = [
  [
    new RegExp(`^d-(${breakpoints})-(.+)$`),
    (m) => `${bp(m[1])}:${m[2] === 'none' ? 'hidden' : m[2]}`,
  ],
  [/^d-none$/, () => 'hidden'],
  [/^d-(.+)$/, (m) => m[1]],
  [
    new RegExp(`^justify-content-(${breakpoints})-(.+)$`),
    (m) => `${bp(m[1])}:justify-${m[2]}`,
  ],
  [/^justify-content-(.+)$/, (m) => `justify-${m[1]}`],
  [/^align-items-(.+)$/, (m) => `items-${m[1]}`],
  [/^align-self-(.+)$/, (m) => `self-${m[1]}`],
  [/^align-content-(.+)$/, (m) => `content-${m[1]}`],
  [/^flex-column$/, () => 'flex-col'],
  [/^flex-column-reverse$/, () => 'flex-col-reverse'],
  [/^flex-grow-1$/, () => 'grow'],
  [/^flex-grow-0$/, () => 'grow-0'],
  [/^flex-shrink-1$/, () => 'shrink'],
  [/^flex-shrink-0$/, () => 'shrink-0'],
  [/^flex-fill$/, () => 'flex-1'],
  [
    new RegExp(`^col-(${breakpoints})-(\\d+)$`),
    (m) => `${bp(m[1])}:col-span-${m[2]}`,
  ],
  [new RegExp(`^col-(${breakpoints})(-auto)?$`), (m) => `${bp(m[1])}:flex-1`],
  [/^col-(\d+)$/, (m) => `col-span-${m[1]}`],
  [/^col$/, () => 'flex-1'],
  [/^row$/, () => 'grid grid-cols-12 (or flex)'],
  [
    /^g([xy]?)-(\d)$/,
    (m) => `gap-${m[1]}${m[1] ? '-' : ''}${m[2]} (convert by size)`,
  ],
  [/^w-100$/, () => 'w-full'],
  [/^h-100$/, () => 'h-full'],
  [
    /^([hw])-(25|50|75)$/,
    (m) => `${m[1]}-${m[2] === '25' ? '1/4' : m[2] === '50' ? '1/2' : '3/4'}`,
  ],
  [/^text-truncate$/, () => 'truncate'],
  [/^visually-hidden(-focusable)?$/, () => 'sr-only'],
  [new RegExp(`^(text|bg|border)-(${state})$`), (m) => `${m[1]}-state-${m[2]}`],
  [
    /^text-(muted|body(-.+)?|secondary|light|dark)$/,
    () => '--text-body-secondary',
  ],
  [/^table(-.+)?$/, () => 'tum-ui-table / tumUiTable'],
  [/^btn-group(-.+)?$/, () => 'tum-ui-button-group'],
  [/^(close|btn-close(-white)?)$/, () => 'tum-ui-button'],
  [/^btn(-.+)?$/, () => 'tum-ui-button / tumUiButton'],
  [/^badge$/, () => 'tum-ui-tag'],
  [/^alert(-.+)?$/, () => 'tum-ui-message'],
  [/^card(-.+)?$/, () => 'tum-ui-card / tum-ui-panel'],
  [/^form-check(-.+)?$/, () => 'tum-ui-checkbox / tum-ui-radio-button'],
  [/^form-select(-.+)?$/, () => 'tum-ui-select'],
  [/^form-control-label$/, () => 'tum-ui-form-field'],
  [/^form-control(-plaintext|-color)?$/, () => 'tumUiInput'],
  [/^form-control-(sm|lg)$/, () => 'tumUiInput size'],
  [/^form-range$/, () => 'tumUiInput type=range'],
  [
    /^(form-(group|label|text|floating)|col-form-label(-.+)?|(valid|invalid)-feedback)$/,
    () => 'tum-ui-form-field',
  ],
  [/^input-group(-.+)?$/, () => 'tum-ui-input-group'],
  [/^(modal|offcanvas)(-.+)?$/, () => 'tum-ui-dialog'],
  [/^dropdown(-.+)?$/, () => 'tum-ui-menu'],
  [
    /^nav(-(link|item|tabs|pills|fill|justified|underline))?$/,
    () => 'tum-ui-tabs',
  ],
  [/^navbar(-.+)?$/, () => 'application shell (no kit component)'],
  [/^(pagination|page-link|page-item)$/, () => 'tum-ui-paginator'],
  [/^spinner-(border|grow)(-sm)?$/, () => 'tum-ui-progress-spinner'],
  [/^popover(-.+)?$/, () => 'tum-ui-popover'],
  [/^toast(-.+)?$/, () => 'tum-ui-message'],
  [/^list-group(-.+)?$/, () => 'tum-ui-list'],
  [
    /^(accordion(-.+)?|collapse|collapsing|collapse-horizontal)$/,
    () => 'tum-ui-panel',
  ],
  [/^breadcrumb(-.+)?$/, () => 'plain markup with Tailwind'],
  [/^carousel(-.+)?$/, () => 'no kit component yet'],
]

export const bootstrapTarget = (token: string) => {
  if (isCustomClass(token))
    return 'custom class: rename (banned by prefix only)'
  for (const [re, render] of exact) {
    const m = re.exec(token)
    if (m) return render(m)
  }
  return ''
}

// PrimeNG elements, directives and services map to the kit component that covers the same job,
// only when the kit of the analyzed commit ships that selector.
const primengKit: [RegExp, string][] = [
  [
    /^(pInputText|p-inputtext|pInputTextarea|pTextarea|p-textarea)$/,
    'tumUiInput',
  ],
  [
    /^(DialogService|DynamicDialogRef|DynamicDialogConfig|p-dialog|p-dynamicdialog)$/,
    'tum-ui-dialog',
  ],
  [
    /^(ConfirmationService|p-confirmdialog|p-confirmpopup)$/,
    'tum-ui-confirm-dialog',
  ],
  [/^(MessageService|p-toast|p-message|p-messages)$/, 'tum-ui-message'],
  [/^(p-badge|pBadge|p-tag)$/, 'tum-ui-tag'],
  [/^(p-dropdown|p-select|p-multiselect|p-listbox)$/, 'tum-ui-select'],
  [/^(p-inputswitch|p-toggleswitch)$/, 'tum-ui-toggle-switch'],
  [/^(p-progressbar)$/, 'tum-ui-progress-bar'],
  [/^(p-progressspinner)$/, 'tum-ui-progress-spinner'],
  [
    /^(p-tabs|p-tablist|p-tab|p-tabpanels|p-tabpanel|p-tabview|p-tabmenu)$/,
    'tum-ui-tabs',
  ],
  [/^(p-menu|p-tieredmenu|p-contextmenu|p-menubar)$/, 'tum-ui-menu'],
  [/^(p-selectbutton|p-togglebutton)$/, 'tum-ui-select-button'],
  [/^(p-autocomplete)$/, 'tum-ui-autocomplete'],
  [/^(p-calendar|p-datepicker)$/, 'tum-ui-date-picker'],
  [/^(p-iconfield|p-inputicon)$/, 'tum-ui-icon-field'],
  [/^(p-inputgroup|p-inputgroupaddon)$/, 'tum-ui-input-group'],
  [/^(p-inputnumber)$/, 'tum-ui-input-number'],
  [/^(p-radiobutton)$/, 'tum-ui-radio-button'],
  [/^(p-checkbox)$/, 'tum-ui-checkbox'],
  [/^(p-paginator)$/, 'tum-ui-paginator'],
  [/^(p-panel|p-fieldset|p-accordion|p-accordion-panel)$/, 'tum-ui-panel'],
  [/^(p-card)$/, 'tum-ui-card'],
  [/^(p-popover|p-overlaypanel)$/, 'tum-ui-popover'],
  [/^(pTooltip)$/, 'tumUiTooltip'],
  [/^(pButton|p-button)$/, 'tum-ui-button'],
  [/^(p-buttongroup)$/, 'tum-ui-button-group'],
  [/^(p-table|p-treetable|p-scroller)$/, 'tum-ui-table'],
  [/^(pSortableColumn|p-sorticon)$/, 'tumUiSortableColumn'],
  [/^(p-chip)$/, 'tum-ui-chip'],
  [/^(p-chart)$/, 'tum-ui-bar-chart'],
  [
    /^(p-skeleton|p-divider|p-splitter|p-splitterpanel|p-avatar|p-rating|p-slider|p-knob|p-tree|p-steps|p-stepper|p-editor|p-fileupload|p-galleria|p-image|p-carousel|p-timeline|p-orderlist|p-picklist|p-colorpicker|p-inputmask|p-password|p-floatlabel)$/,
    'no kit component yet',
  ],
]
export const kitTarget = (name: string, kit: Set<string>) => {
  const target = primengKit.find(([re]) => re.test(name))?.[1]
  if (target) return target.startsWith('no ') || kit.has(target) ? target : ''
  // Attribute directives such as pRipple or pTemplate belong to their host component.
  return ''
}

// ng-bootstrap components and directives map to the kit component that covers the same job.
const ngbKit: [RegExp, string][] = [
  [/^(ngbTooltip|NgbTooltip)/, 'tumUiTooltip'],
  [/^(ngb-popover|ngbPopover)/, 'tum-ui-popover'],
  [/^(NgbModal|NgbActiveModal|ngb-modal)/, 'tum-ui-dialog'],
  [/^ngbDropdown/, 'tum-ui-menu'],
  [/^ngb-pagination/, 'tum-ui-paginator'],
  [/^(ngbNav|ngb-nav)/, 'tum-ui-tabs'],
  [/^(ngb-datepicker|ngbDatepicker)/, 'tum-ui-date-picker'],
  [/^(ngbCollapse|ngb-accordion|ngbAccordion)/, 'tum-ui-panel'],
  [/^(ngbTypeahead|ngb-typeahead)/, 'tum-ui-autocomplete'],
  [/^ngb-progressbar/, 'tum-ui-progress-bar'],
  [/^ngb-alert/, 'tum-ui-message'],
  [/^ngb-carousel/, 'no kit component yet'],
  [/^ngb-rating/, 'no kit component yet'],
  [/^ngb-timepicker/, 'no kit component yet'],
]
export const ngbTarget = (name: string, kit: Set<string>) => {
  const target = ngbKit.find(([re]) => re.test(name))?.[1] ?? ''
  return target.startsWith('no ') || kit.has(target) ? target : ''
}

// Families group the remaining classes by the kind of work they need.
export const families = [
  'Layout',
  'Grid',
  'Text & color',
  'Buttons',
  'Forms',
  'Tables',
  'Components',
] as const
export type Family = (typeof families)[number]
const familyPatterns: [RegExp, Family][] = [
  [/^btn/, 'Buttons'],
  [/^(close|btn-close)$/, 'Buttons'],
  [/^(form-|input-group|col-form-label|(valid|invalid)-feedback)/, 'Forms'],
  [/^table/, 'Tables'],
  [/^(row|col|g[xy]?-)/, 'Grid'],
  [/^(d-|justify-content-|align-|flex-|[hw]-(25|50|75|100)$)/, 'Layout'],
  [/^(text-|bg-|border-|visually-hidden)/, 'Text & color'],
]
export const family = (token: string): Family =>
  familyPatterns.find(([re]) => re.test(token))?.[1] ?? 'Components'

// Occurrences a kit component already covers, versus all occurrences of the library.
export const kitCoverage = (
  entries: { name: string; occurrences: number }[],
  target: (name: string) => string,
): [number, number] => [
  entries
    .filter((e) => {
      const t = target(e.name)
      return t && !t.startsWith('no ')
    })
    .reduce((n, e) => n + e.occurrences, 0),
  entries.reduce((n, e) => n + e.occurrences, 0),
]
