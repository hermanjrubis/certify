/**
 * 4-Step Progress Stepper component.
 * Template -> Design -> Recipients -> Review & export
 */

export function renderStepper(el, activeStep = 1, done = []) {
  if (!el) return;

  const steps = [
    { num: 1, label: 'Template' },
    { num: 2, label: 'Design' },
    { num: 3, label: 'Recipients' },
    { num: 4, label: 'Review & export' }
  ];

  el.innerHTML = `
    <nav class="app-stepper" aria-label="Editor progress">
      <ol class="stepper-list">
        ${steps.map((s, idx) => {
          const isActive = s.num === activeStep;
          const isDone = done.includes(s.num);
          const icon = isDone ? '✓' : s.num;
          return `
            <li class="stepper-step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" data-step="${s.num}">
              <span class="stepper-num">${icon}</span>
              <span class="stepper-label">${s.label}</span>
            </li>
            ${idx < steps.length - 1 ? '<li class="stepper-divider" aria-hidden="true"></li>' : ''}
          `;
        }).join('')}
      </ol>
    </nav>
  `;
}

