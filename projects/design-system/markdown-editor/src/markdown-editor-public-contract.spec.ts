import { InputSignal, OutputEmitterRef } from '@angular/core';
import {
  MarkdownEditorComponent,
  MarkdownEditorStickyBottomInsetDirective,
  type MarkdownEditorImageConfig,
  type MarkdownEditorLabels,
  type MarkdownEditorWikiLinkConfig,
} from '@alittlemoron/design-system/markdown-editor';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type ValueContract = Expect<Equal<MarkdownEditorComponent['value'], InputSignal<string>>>;
type AccessibleLabelContract = Expect<
  Equal<MarkdownEditorComponent['accessibleLabel'], InputSignal<string>>
>;
type LabelsContract = Expect<
  Equal<MarkdownEditorComponent['labels'], InputSignal<MarkdownEditorLabels>>
>;
type ImageConfigContract = Expect<
  Equal<MarkdownEditorComponent['imageConfig'], InputSignal<MarkdownEditorImageConfig | null>>
>;
type ImageInteractionsDisabledContract = Expect<
  Equal<MarkdownEditorComponent['imageInteractionsDisabled'], InputSignal<boolean>>
>;
type WikiLinksContract = Expect<
  Equal<MarkdownEditorComponent['wikiLinks'], InputSignal<MarkdownEditorWikiLinkConfig | null>>
>;
type ValueChangeContract = Expect<
  Equal<MarkdownEditorComponent['valueChange'], OutputEmitterRef<string>>
>;
type UploadPendingContract = Expect<
  Equal<MarkdownEditorComponent['imageUploadPendingChange'], OutputEmitterRef<boolean>>
>;
type FocusContract = Expect<Equal<MarkdownEditorComponent['focus'], () => void>>;
type EditorPublicKeysContract = Expect<
  Equal<
    keyof MarkdownEditorComponent,
    | 'value'
    | 'accessibleLabel'
    | 'labels'
    | 'imageConfig'
    | 'imageInteractionsDisabled'
    | 'wikiLinks'
    | 'valueChange'
    | 'imageUploadPendingChange'
    | 'focus'
    | 'ngAfterViewInit'
    | 'ngAfterViewChecked'
    | 'ngOnDestroy'
  >
>;
type StickyInsetContract = Expect<
  Equal<
    MarkdownEditorStickyBottomInsetDirective['dsMarkdownEditorStickyBottomInset'],
    InputSignal<HTMLElement>
  >
>;
type StickyInsetPublicKeysContract = Expect<
  Equal<
    keyof MarkdownEditorStickyBottomInsetDirective,
    'dsMarkdownEditorStickyBottomInset' | 'ngOnInit' | 'ngOnDestroy'
  >
>;

type MarkdownEditorPublicContractAssertions = readonly [
  ValueContract,
  AccessibleLabelContract,
  LabelsContract,
  ImageConfigContract,
  ImageInteractionsDisabledContract,
  WikiLinksContract,
  ValueChangeContract,
  UploadPendingContract,
  FocusContract,
  EditorPublicKeysContract,
  StickyInsetContract,
  StickyInsetPublicKeysContract,
];

describe('Markdown editor public contract', () => {
  it('keeps application-independent inputs, outputs, and focus as its consumer surface', () => {
    const contracts: MarkdownEditorPublicContractAssertions = [
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ];

    expect(contracts).toHaveLength(12);
  });
});
