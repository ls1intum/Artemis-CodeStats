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
  [/^table(-.+)?$/, () => 'tumaet-ui-table / tumAetUiTable'],
  [/^btn-group(-.+)?$/, () => 'tumaet-ui-button-group'],
  [/^(close|btn-close(-white)?)$/, () => 'tumaet-ui-button'],
  [/^btn(-.+)?$/, () => 'tumaet-ui-button / tumAetUiButton'],
  [/^badge$/, () => 'tumaet-ui-tag'],
  [/^alert(-.+)?$/, () => 'tumaet-ui-message'],
  [/^card(-.+)?$/, () => 'tumaet-ui-card / tumaet-ui-panel'],
  [/^form-check(-.+)?$/, () => 'tumaet-ui-checkbox / tumaet-ui-radio-button'],
  [/^form-select(-.+)?$/, () => 'tumaet-ui-select'],
  [/^form-control-label$/, () => 'tumaet-ui-form-field'],
  [/^form-control(-plaintext|-color)?$/, () => 'tumAetUiInput'],
  [/^form-control-(sm|lg)$/, () => 'tumAetUiInput size'],
  [/^form-range$/, () => 'tumAetUiInput type=range'],
  [
    /^(form-(group|label|text|floating)|col-form-label(-.+)?|(valid|invalid)-feedback)$/,
    () => 'tumaet-ui-form-field',
  ],
  [/^input-group(-.+)?$/, () => 'tumaet-ui-input-group'],
  [/^(modal|offcanvas)(-.+)?$/, () => 'tumaet-ui-dialog'],
  [/^dropdown(-.+)?$/, () => 'tumaet-ui-menu'],
  [
    /^nav(-(link|item|tabs|pills|fill|justified|underline))?$/,
    () => 'tumaet-ui-tabs',
  ],
  [/^navbar(-.+)?$/, () => 'application shell (no kit component)'],
  [/^(pagination|page-link|page-item)$/, () => 'tumaet-ui-paginator'],
  [/^spinner-(border|grow)(-sm)?$/, () => 'tumaet-ui-progress-spinner'],
  [/^popover(-.+)?$/, () => 'tumaet-ui-popover'],
  [/^toast(-.+)?$/, () => 'tumaet-ui-message'],
  [/^list-group(-.+)?$/, () => 'tumaet-ui-list'],
  [
    /^(accordion(-.+)?|collapse|collapsing|collapse-horizontal)$/,
    () => 'tumaet-ui-panel',
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

// PrimeNG and ng-bootstrap usages map to the kit component that covers the same job, only when
// the kit of the analyzed commit ships it. Names are compared case- and hyphen-insensitively
// (`p-confirmDialog`, `p-confirmdialog`, `p-confirm-dialog` are one component). Parts of a
// component (templates, sub-elements, icons) go away with their host and are not gaps of their own.
export const partOfHost = 'part of its host component'
const noKit = 'no kit component yet'
const key = (name: string) => name.toLowerCase().replace(/-/g, '')
const primengKit: [RegExp, string][] = [
  [/^(pinputtext|pinputtextarea|ptextarea)$/, 'tumAetUiInput'],
  [
    /^(dialogservice|dynamicdialogref|dynamicdialogconfig|pdialog|pdynamicdialog)$/,
    'tumaet-ui-dialog',
  ],
  [
    /^(confirmationservice|pconfirmdialog|pconfirmpopup)$/,
    'tumaet-ui-confirm-dialog',
  ],
  [/^(messageservice|ptoast|pmessage|pmessages)$/, 'tumaet-ui-message'],
  [/^(pbadge|ptag)$/, 'tumaet-ui-tag'],
  [/^(pdropdown|pselect|pmultiselect|plistbox)$/, 'tumaet-ui-select'],
  [/^(pinputswitch|ptoggleswitch)$/, 'tumaet-ui-toggle-switch'],
  [/^pprogressbar$/, 'tumaet-ui-progress-bar'],
  [/^pprogressspinner$/, 'tumaet-ui-progress-spinner'],
  [
    /^(ptabs|ptablist|ptab|ptabpanels|ptabpanel|ptabview|ptabmenu)$/,
    'tumaet-ui-tabs',
  ],
  [/^(pmenu|ptieredmenu|pcontextmenu|pmenubar)$/, 'tumaet-ui-menu'],
  [/^(pselectbutton|ptogglebutton)$/, 'tumaet-ui-select-button'],
  [/^pautocomplete$/, 'tumaet-ui-autocomplete'],
  [/^(pcalendar|pdatepicker)$/, 'tumaet-ui-date-picker'],
  [/^(piconfield|pinputicon)$/, 'tumaet-ui-icon-field'],
  [/^(pinputgroup|pinputgroupaddon)$/, 'tumaet-ui-input-group'],
  [/^pinputnumber$/, 'tumaet-ui-input-number'],
  [/^pradiobutton$/, 'tumaet-ui-radio-button'],
  [/^pcheckbox$/, 'tumaet-ui-checkbox'],
  [/^ppaginator$/, 'tumaet-ui-paginator'],
  [/^(ppanel|pfieldset|paccordion)$/, 'tumaet-ui-panel'],
  [/^pcard$/, 'tumaet-ui-card'],
  [/^(ppopover|poverlaypanel)$/, 'tumaet-ui-popover'],
  [/^ptooltip$/, 'tumAetUiTooltip'],
  [/^(pbutton|pbuttondirective)$/, 'tumaet-ui-button'],
  [/^pbuttongroup$/, 'tumaet-ui-button-group'],
  [/^(ptable|ptreetable|pscroller)$/, 'tumaet-ui-table'],
  [/^(psortablecolumn|psorticon)$/, 'tumAetUiSortableColumn'],
  [/^pchip$/, 'tumaet-ui-chip'],
  [/^pchart$/, 'tumaet-ui-bar-chart'],
  [
    /^(ptemplate|pbuttonicon|pbuttonlabel|psize|pfrozencolumn|paccordion(panel|header|content|tab)|pcolumnfilter|ptable(header)?checkbox|pautofocus|pripple|pstyleclass)$/,
    partOfHost,
  ],
  [
    /^(pskeleton|pdivider|psplitter|psplitterpanel|pavatar|prating|pslider|pknob|ptree|psteps|pstepper|peditor|pfileupload|pgalleria|pimage|pcarousel|ptimeline|porderlist|ppicklist|pcolorpicker|pinputmask|ppassword|pfloatlabel)$/,
    noKit,
  ],
]
const ngbKit: [RegExp, string][] = [
  [/^ngbtooltip$/, 'tumAetUiTooltip'],
  [/^(ngbpopover)$/, 'tumaet-ui-popover'],
  [/^(ngbmodal|ngbactivemodal|ngbmodalref)$/, 'tumaet-ui-dialog'],
  [/^ngbdropdown/, 'tumaet-ui-menu'],
  [/^ngbpagination$/, 'tumaet-ui-paginator'],
  [/^ngbnav/, 'tumaet-ui-tabs'],
  [/^(ngbdatepicker|ngbinputdatepicker)$/, 'tumaet-ui-date-picker'],
  [/^(ngbcollapse|ngbaccordion)/, 'tumaet-ui-panel'],
  [/^ngbtypeahead$/, 'tumaet-ui-autocomplete'],
  [/^ngbprogressbar$/, 'tumaet-ui-progress-bar'],
  [/^ngbalert$/, 'tumaet-ui-message'],
  [/^(ngbhighlight|ngbautofocus)$/, partOfHost],
  [/^(ngbcarousel|ngbslide|ngbrating|ngbtimepicker)/, noKit],
]
const target = (table: [RegExp, string][], name: string, kit: Set<string>) => {
  const found = table.find(([re]) => re.test(key(name)))?.[1] ?? ''
  return found === partOfHost || found === noKit || kit.has(found) ? found : ''
}
export const kitTarget = (name: string, kit: Set<string>) =>
  target(primengKit, name, kit)
export const ngbTarget = (name: string, kit: Set<string>) =>
  target(ngbKit, name, kit)

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

// Occurrences a kit component already covers, versus all occurrences of the library; parts of a
// component count with their host, not on their own.
export const kitCoverage = (
  entries: { name: string; occurrences: number }[],
  target: (name: string) => string,
): [number, number] => {
  const counted = entries.filter((e) => target(e.name) !== partOfHost)
  return [
    counted
      .filter((e) => {
        const t = target(e.name)
        return t && t !== noKit
      })
      .reduce((n, e) => n + e.occurrences, 0),
    counted.reduce((n, e) => n + e.occurrences, 0),
  ]
}
