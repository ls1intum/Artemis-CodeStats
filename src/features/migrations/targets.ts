// Targets from the Bootstrap → TUM UI/Tailwind quick reference in Artemis's client-development
// guideline, anchored to the class families the guideline names; other tokens get no target.
const bootstrapTargets: [RegExp, string][] = [
  [/^btn-group(-.+)?$/, 'tum-ui-button-group'],
  [/^btn(-.+)?$/, 'tum-ui-button / tumUiButton'],
  [/^badge$/, 'tum-ui-tag'],
  [/^alert(-.+)?$/, 'tum-ui-message'],
  [/^card(-.+)?$/, 'tum-ui-card / tum-ui-panel'],
  [/^table(-.+)?$/, 'tum-ui-table / tumUiTable'],
  [/^form-check(-.+)?$/, 'tum-ui-checkbox / tum-ui-radio-button'],
  [/^form-select$/, 'tum-ui-select'],
  [/^form-(control(-.+)?|range|floating)$/, 'tumUiInput'],
  [
    /^(form-(group|label|text)|col-form-label(-.+)?|(valid|invalid)-feedback)$/,
    'tum-ui-form-field',
  ],
  [/^input-group(-.+)?$/, 'tum-ui-input-group'],
  [
    /^(row|col|col-.+|g[xy]?-[0-5])$/,
    'grid grid-cols-12 + col-span-* / flex + gap-*',
  ],
  [/^d-none$/, 'hidden'],
  [/^d-(sm|md|lg|xl|xxl)-/, 'md:flex / md:hidden …'],
  [/^d-/, 'flex / block / grid / inline-block'],
  [/^justify-content-/, 'justify-*'],
  [/^align-items-/, 'items-*'],
  [/^align-self-/, 'self-*'],
  [/^align-content-/, 'content-*'],
  [/^flex-column/, 'flex-col'],
  [/^flex-(grow|shrink)-/, 'grow / shrink'],
  [/^flex-fill$/, 'flex-1'],
  [/^text-(muted|body(-.+)?|secondary|light|dark)$/, '--text-body-secondary'],
  [
    /^(text|border|bg)-(danger|success|warning|info)$/,
    'text-state-* / bg-state-* / border-state-*',
  ],
  [/^(modal|offcanvas)(-.+)?$/, 'tum-ui-dialog'],
  [/^dropdown(-.+)?$/, 'tum-ui-menu'],
  [/^nav(-(link|item|tabs|pills|fill|justified|underline))?$/, 'tum-ui-tabs'],
  [/^(pagination|page-link|page-item)$/, 'tum-ui-paginator'],
  [/^spinner-(border|grow)(-sm)?$/, 'tum-ui-progress-spinner'],
  [/^popover(-.+)?$/, 'tum-ui-popover'],
  [/^toast(-.+)?$/, 'tum-ui-message'],
  [/^list-group(-.+)?$/, 'tum-ui-list'],
  [
    /^(accordion(-.+)?|collapse|collapsing|collapse-horizontal)$/,
    'tum-ui-panel',
  ],
  [/^[hw]-(25|50|75|100)$/, 'w-full / h-full or an explicit size'],
  [/^(close|btn-close)$/, 'tum-ui-button'],
  [/^visually-hidden(-focusable)?$/, 'sr-only'],
  [/^text-truncate$/, 'truncate'],
]
export const bootstrapTarget = (name: string) =>
  bootstrapTargets.find(([re]) => re.test(name))?.[1] ?? ''

// A PrimeNG element or directive maps to a kit selector only when the kit ships that selector.
export const kitTarget = (name: string, kit: Set<string>) => {
  const candidates = /^p-/.test(name)
    ? [
        `tum-ui-${name.slice(2)}`,
        `tum-ui-${name.slice(2).replace(/(bar|spinner|switch|button|number|picker|dialog|field|group)$/, '-$1')}`,
      ]
    : /^p[A-Z]/.test(name)
      ? [`tumUi${name.slice(1)}`]
      : []
  return candidates.find((c) => kit.has(c)) ?? ''
}
