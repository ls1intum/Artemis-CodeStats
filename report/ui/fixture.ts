import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const app = 'src/main/webapp/app'
// Same export shape as Artemis's rules/no-bootstrap-classes.mjs, reduced to a few families.
const ruleSource = `
const BANNED = [/^btn(-.+)?$/, /^row$/, /^col(-.+)?$/, /^d-flex$/, /^text-danger$/, /^table$/]
export function isBanned(token) { return BANNED.some((re) => re.test(token)) }
export function bannedClassesInBindingExpression(source) {
  const found = []
  for (const re of [/'([^']*)'|"([^"]*)"/g, /[{,]\\s*([A-Za-z_$][\\w$]*)\\s*:/g]) {
    let match
    while ((match = re.exec(source)) !== null)
      for (const token of (match[1] ?? match[2]).split(/\\s+/)) if (token && isBanned(token)) found.push(token)
  }
  return found
}
export default {}
`
export const fixtureFiles: Record<string, string> = {
  'rules/no-bootstrap-classes.mjs': ruleSource,
  'eslint.config.mjs': `
export default [
  { files: ['${app}/**/*.html'], rules: { 'localRules/no-raw-tailwind-color-palette': 'error' } },
  {
    // Regression lock
    files: ['${app}/admin/**/*.html', '${app}/core/alert/alert.component.html', 'packages/tum-ui/src/lib/**/*.html'],
    rules: { 'localRules/no-bootstrap-classes': 'error' },
  },
]`,
  'src/main/webapp/tailwind.css': `@source './app/admin';\n@source './app/exam/manage';\n@source not './app/x';\n@source inline("sr-only");\n`,
  'packages/tum-ui/src/lib/button/tum-ui-button.component.ts': `import { Component, Directive } from '@angular/core'
@Component({ selector: 'tum-ui-button', template: '' }) export class TumUiButtonComponent {}
@Directive({ selector: 'a[tumUiButton], button[tumUiButton]' }) export class TumUiButtonDirective {}`,
  'packages/tum-ui/src/lib/button/tum-ui-button.stories.ts': `import { Component } from '@angular/core'
@Component({ selector: 'tum-ui-button-story', template: '' }) export class Story {}`,
  [`${app}/admin/list/list.component.ts`]: `import { Component, HostBinding } from '@angular/core'
import { ButtonModule } from 'primeng/button'
import { TumUiButtonComponent } from '@tumaet/ui-angular'
@Component({ selector: 'jhi-list', templateUrl: './list.component.html', styleUrl: './list.component.scss', imports: [ButtonModule, TumUiButtonComponent] })
export class ListComponent { @HostBinding('class.row') row = true }`,
  [`${app}/admin/list/list.component.html`]: `<button pButton class="flex"></button><tum-ui-button /><a tumUiButton></a>`,
  [`${app}/admin/list/list.component.scss`]: `.x { color: var(--bs-body-color); }`,
  [`${app}/core/alert/alert.component.ts`]: `import * as ng from '@angular/core'
@ng.Component({ selector: 'jhi-alert', template: '<div class="alert-wrap {{ cls }}"></div>' }) export class AlertComponent {}`,
  [`${app}/exam/manage/page/page.component.ts`]: `import { Component } from '@angular/core'
import { NgbTooltip } from '@ng-bootstrap/ng-bootstrap'
import { ButtonComponent } from 'app/shared-ui/button/button.component'
import { AlertComponent } from '../../../core/alert/alert.component'
@Component({ selector: 'jhi-page', templateUrl: './page.component.html', styleUrls: ['./page.component.scss', '../shared.scss'], imports: [NgbTooltip, ButtonComponent, AlertComponent] })
export class PageComponent { open() { return import('../dialog/dialog.component') } }`,
  [`${app}/exam/manage/page/page.component.html`]: `<jhi-button ngbTooltip="x" class="p-3 mb-2 gap-2 my-modal-wrapper"></jhi-button>
<!-- <div class="btn"></div> -->
<div *ngIf="ok" [ngClass]="{ btn: ok, 'd-flex': !ok }" [class.table]="ok"></div>
@if (ok) { <span [class]="ok ? 'row' : x">btn text</span> } @else { <p-dialog styleClass="col-md-2 my-thing"></p-dialog> }
@switch (s) { @case (1) { <div class="text-danger {{ tone }}"></div> } }`,
  [`${app}/exam/manage/page/page.component.scss`]: `/* #fff */ .a { color: #ff0000; background: rgb(1, 2, 3); }`,
  [`${app}/exam/manage/shared.scss`]: `@use 'bootstrap/scss/functions';`,
  [`${app}/exam/manage/dialog/dialog.component.ts`]: `import { Component } from '@angular/core'
@Component({ selector: 'jhi-dialog', templateUrl: './dialog.component.html' }) export class DialogComponent {}`,
  [`${app}/exam/manage/dialog/dialog.component.html`]: `<div class="grid gap-2 mb-3 sm:flex-col"></div>`,
  [`${app}/exam/manage/clean/clean.component.ts`]: `import { Component } from '@angular/core'
import { ButtonComponent } from 'app/shared-ui/button/button.component'
@Component({ selector: 'jhi-clean', templateUrl: './clean.component.html', imports: [ButtonComponent] }) export class CleanComponent { buttonClass = 'btn' }`,
  [`${app}/exam/manage/enum-only/enum-only.component.ts`]: `import { Component } from '@angular/core'
import { ButtonType } from 'app/shared-ui/button/button.component'
import type { PageComponent } from '../page/page.component'
@Component({ selector: 'jhi-enum-only', templateUrl: './enum-only.component.html' }) export class EnumOnlyComponent { type = ButtonType.PRIMARY }`,
  [`${app}/exam/manage/enum-only/enum-only.component.html`]: `<div class="flex"></div>`,
  [`${app}/exam/manage/pair/pair.component.ts`]: `import { Component } from '@angular/core'
@Component({ selector: 'jhi-pair-a', templateUrl: './pair.component.html', host: { class: 'row' } }) export class PairAComponent {}
@Component({ selector: 'jhi-pair-b', template: '<div class="btn"></div>' }) export class PairBComponent {}
@Component({ selector: 'jhi-pair-c', templateUrl: './pair.component.html' }) export class PairCComponent {}`,
  [`${app}/exam/manage/pair/pair.component.html`]: `<div class="d-flex"></div>`,
  [`${app}/exam/manage/exam.routes.ts`]: `import { DialogComponent } from './dialog/dialog.component'
export const routes = [
  { path: 'page/:id', loadComponent: () => import('./page/page.component').then((m) => m.PageComponent) },
  { path: 'dialog', component: DialogComponent, children: [{ path: 'nested', component: DialogComponent }] },
]`,
  [`${app}/app.component.ts`]: `import { Component } from '@angular/core'
@Component({ selector: 'jhi-app', template: '<router-outlet />' }) export class AppComponent {}`,
  [`${app}/exam/manage/clean/clean.component.html`]: `<div class="flex"></div>`,
  [`${app}/shared-ui/button/button.component.ts`]: `import { Component, input } from '@angular/core'
@Component({ selector: 'jhi-button', templateUrl: './button.component.html', host: { '[class.d-flex]': 'inline()' } })
export class ButtonComponent { readonly buttonClass = input('btn btn-primary'); ngOnInit() { this.renderer.addClass(this.el, 'btn-sm') } }
export enum ButtonType { PRIMARY = 'btn-primary' }`,
  [`${app}/shared-ui/button/button.component.html`]: `<button [class]="buttonClass()"></button>`,
  [`${app}/shared-ui/button/button.component.spec.ts`]: `const x = 'btn'`,
  [`${app}/shared-ui/util.ts`]: `export const rowClass = 'row'`,
  'src/main/webapp/content/scss/global.scss': `body { color: var(--bs-body-color); }\n.dark { color: #000; }`,
}

export function writeFixture(root: string, files: Record<string, string>) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(join(root, dirname(path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }
}
