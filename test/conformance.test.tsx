import { act, runConformanceTests } from '@owload/editor-sdk/testing';
import { extension } from '../src/extension';

function textarea(container: HTMLElement): HTMLTextAreaElement {
  return container.querySelector('textarea')!;
}

runConformanceTests(extension, {
  sample: new TextEncoder().encode('hello'),
  ready: (container) => !!container.querySelector('textarea'),
  focusTarget: (container) => container.querySelector('textarea'),
  supportsReadOnly: true,
  async edit(container) {
    const area = textarea(container);
    await act(async () => {
      area.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(area, area.value + '!');
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
  },
  verifyReopened(container) {
    if (textarea(container).value !== 'hello!') throw new Error(`Reopened with "${textarea(container).value}".`);
  },
});
