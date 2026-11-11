/**
 * 4-Step Progress Stepper component.
 * Template -> Design -> Recipients -> Review & export
 */

export function renderStepper(el, activeStep = 1, done = [], { onStepClick } = {}) {
  if (!el) return;

  const hasTemplate = done.includes(1) || activeStep >= 2;

  const steps = [
    { num: 1, label: 'Template', disabled: true },
    { num: 2, label: 'Design', disabled: !hasTemplate },
    { num: 3, label: 'Recipients', disabled: !hasTemplate },
    { num: 4, label: 'Review & export', disabled: !hasTemplate }
  ];

  el.innerHTML = `
    <nav class="app-stepper" aria-label="Editor progress">
      <ol class="stepper-list">
        ${steps.map((s, idx) => {
          const isActive = s.num === activeStep;
          const isDone = done.includes(s.num);
          const icon = isDone ? '✓' : s.num;
          return `
            <li class="stepper-item">
              <button type="button" 
                      class="stepper-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" 
                      data-step="${s.num}" 
                      ${s.disabled ? 'aria-disabled="true"' : ''}
                      title="${s.disabled ? (s.num === 1 ? 'Go to upload screen via ⋯ › New project' : 'Upload a template first') : s.label}">
                <span class="stepper-num">${icon}</span>
                <span class="stepper-label">${s.label}</span>
              </button>
            </li>
            ${idx < steps.length - 1 ? '<li class="stepper-divider" aria-hidden="true"></li>' : ''}
          `;
        }).join('')}
      </ol>
    </nav>
  `;

  if (onStepClick) {
    el.querySelectorAll('.stepper-step').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.getAttribute('aria-disabled') === 'true') return;
        const num = parseInt(btn.dataset.step, 10);
        onStepClick(num);
      });
    });
  }
}
