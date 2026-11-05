/**
 * @license
 * Copyright (c) 2026, MariaDB plc.
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import {
  authWizardRouteKey,
  type AuthWizardChoice,
  type AuthWizardProvider,
  type AuthWizardSubmission,
  type AuthWizardWireApi,
} from '../authWizardTypes.js';
import type { ChromeStrings } from '../strings.js';
import { TITLE_GRADIENT } from './QwenOnboarding.js';
import { WelcomeSeal } from './WelcomeSeal.js';

type WizardStep =
  | 'provider'
  | 'protocol'
  | 'wireApi'
  | 'baseUrl'
  | 'apiKey'
  | 'models'
  | 'advanced';

interface WizardAnswers {
  providerId?: string;
  protocol?: string;
  wireApi?: AuthWizardWireApi;
  baseUrl: string;
  apiKey: string;
  models: string;
  enableThinking?: boolean;
}

interface AuthWizardProps {
  providers: AuthWizardProvider[];
  t: ChromeStrings;
  theme: 'light' | 'dark';
  /** The answers were sent and the host is connecting. */
  submitting: boolean;
  /** Error reported by the host for the last submission. */
  error?: string;
  onSubmit: (submission: AuthWizardSubmission) => void;
  onCancel: () => void;
}

const EMPTY_ANSWERS: WizardAnswers = { baseUrl: '', apiKey: '', models: '' };

const WIRE_API_CHOICES: AuthWizardChoice[] = [
  { value: 'chat-completions', label: 'Chat Completions' },
  { value: 'responses', label: 'Responses' },
];

/** The steps of a provider's setup for the answers given so far. */
export function getWizardSteps(
  provider: AuthWizardProvider | undefined,
  answers: Pick<WizardAnswers, 'protocol'>,
): WizardStep[] {
  if (!provider) return ['provider'];
  const steps: WizardStep[] = ['provider'];
  if (provider.protocols) steps.push('protocol');
  if (
    provider.wireApiProtocols.includes(
      provider.protocols ? (answers.protocol ?? '') : '',
    )
  ) {
    steps.push('wireApi');
  }
  if (provider.baseUrl.kind !== 'fixed') steps.push('baseUrl');
  steps.push('apiKey');
  if (provider.models) steps.push('models');
  if (provider.advancedConfig) steps.push('advanced');
  return steps;
}

function baseUrlPlaceholder(
  provider: AuthWizardProvider,
  answers: WizardAnswers,
): string {
  if (provider.baseUrl.kind !== 'input') return '';
  return (
    provider.baseUrl.placeholders[
      authWizardRouteKey(answers.protocol, answers.wireApi)
    ] ?? ''
  );
}

const PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 30,
  display: 'flex',
  overflow: 'auto',
  padding: 24,
  background:
    'var(--vscode-sideBar-background, var(--vscode-editor-background))',
  color: 'var(--vscode-foreground)',
};

const OPTION_STYLE: CSSProperties = {
  display: 'flex',
  width: '100%',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  padding: '7px 10px',
  border: '1px solid transparent',
  borderRadius: 4,
  // Background (and its hover) come from .qwen-vscode-wizard-option in
  // EmbeddedApp's stylesheet: an inline value would override :hover.
  color: 'inherit',
  font: 'inherit',
  textAlign: 'left',
  cursor: 'pointer',
};

const BUTTON_STYLE: CSSProperties = {
  display: 'inline-flex',
  minHeight: 28,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '4px 12px',
  border: '1px solid transparent',
  borderRadius: 4,
  font: 'inherit',
  cursor: 'pointer',
};

const PRIMARY_BUTTON_STYLE: CSSProperties = {
  ...BUTTON_STYLE,
  background: 'var(--vscode-button-background)',
  color: 'var(--vscode-button-foreground)',
  fontWeight: 600,
};

const SECONDARY_BUTTON_STYLE: CSSProperties = {
  ...BUTTON_STYLE,
  background: 'var(--vscode-button-secondaryBackground)',
  color: 'var(--vscode-button-secondaryForeground)',
};

const INPUT_STYLE: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  padding: '5px 8px',
  border: '1px solid var(--vscode-input-border, transparent)',
  borderRadius: 4,
  background: 'var(--vscode-input-background)',
  color: 'var(--vscode-input-foreground)',
  font: 'inherit',
  outlineColor: 'var(--vscode-focusBorder)',
};

/**
 * Provider setup wizard: the steps of the former QuickPick/InputBox flow
 * (provider, protocol, API, base URL or endpoint, API key, models, advanced
 * config), shown inside the view. Choice steps advance on a click; input
 * steps on Next or Enter. The last step sends the answers to the host.
 */
export function AuthWizard({
  providers,
  t,
  theme,
  submitting,
  error,
  onSubmit,
  onCancel,
}: AuthWizardProps) {
  const [history, setHistory] = useState<WizardStep[]>(['provider']);
  const [answers, setAnswers] = useState<WizardAnswers>(EMPTY_ANSWERS);
  const [inputError, setInputError] = useState<string>();
  const panelRef = useRef<HTMLDivElement>(null);

  const step = history[history.length - 1];
  const provider = providers.find((p) => p.id === answers.providerId);
  const steps = getWizardSteps(provider, answers);
  const stepIndex = Math.max(0, steps.indexOf(step));

  // Focus the step's control (the selected choice, the first one, or the
  // input) whenever the step changes, as the QuickPick/InputBox did.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const target =
      panel.querySelector<HTMLElement>('[data-wizard-input]') ??
      panel.querySelector<HTMLElement>(
        '[data-wizard-option][aria-pressed="true"]',
      ) ??
      panel.querySelector<HTMLElement>('[data-wizard-option]');
    target?.focus();
  }, [step]);

  const submit = (final: WizardAnswers) => {
    const target = providers.find((p) => p.id === final.providerId);
    if (!target) return;
    const finalSteps = getWizardSteps(target, final);
    onSubmit({
      providerId: target.id,
      ...(finalSteps.includes('protocol') ? { protocol: final.protocol } : {}),
      ...(finalSteps.includes('wireApi') ? { wireApi: final.wireApi } : {}),
      ...(finalSteps.includes('baseUrl') ? { baseUrl: final.baseUrl } : {}),
      apiKey: final.apiKey,
      ...(finalSteps.includes('models') ? { models: final.models } : {}),
      ...(finalSteps.includes('advanced')
        ? { enableThinking: final.enableThinking }
        : {}),
    });
  };

  /** Go to the step after `from` for `next`, or submit after the last one. */
  const advance = (from: WizardStep, next: WizardAnswers) => {
    setAnswers(next);
    setInputError(undefined);
    const target = providers.find((p) => p.id === next.providerId);
    const nextSteps = getWizardSteps(target, next);
    const following = nextSteps[nextSteps.indexOf(from) + 1];
    if (following) {
      setHistory((current) => [...current, following]);
    } else {
      submit(next);
    }
  };

  const back = () => {
    if (history.length <= 1) return;
    setInputError(undefined);
    setHistory((current) => current.slice(0, -1));
  };

  const choose = (value: string) => {
    if (submitting) return;
    switch (step) {
      case 'provider': {
        const picked = providers.find((p) => p.id === value);
        if (!picked) return;
        // A different provider starts its own answers.
        const next =
          picked.id === answers.providerId
            ? answers
            : {
                ...EMPTY_ANSWERS,
                providerId: picked.id,
                models: picked.models?.join(',') ?? '',
              };
        advance(step, next);
        return;
      }
      case 'protocol':
        advance(
          step,
          value === answers.protocol
            ? answers
            : { ...answers, protocol: value, wireApi: undefined, baseUrl: '' },
        );
        return;
      case 'wireApi':
        advance(step, { ...answers, wireApi: value as AuthWizardWireApi });
        return;
      case 'baseUrl':
        advance(step, { ...answers, baseUrl: value });
        return;
      case 'advanced':
        advance(step, { ...answers, enableThinking: value === 'yes' });
        return;
      default:
        return;
    }
  };

  /** Validate the input step's value the way the host will, then advance. */
  const confirmInput = () => {
    if (submitting || !provider) return;
    if (step === 'baseUrl') {
      const url =
        answers.baseUrl.trim() || baseUrlPlaceholder(provider, answers);
      if (!/^https?:\/\//i.test(url)) {
        setInputError(t('wizard.error.baseUrl'));
        return;
      }
    } else if (step === 'apiKey') {
      if (!answers.apiKey.trim()) {
        setInputError(t('wizard.error.required'));
        return;
      }
    } else if (step === 'models') {
      if (!answers.models.trim()) {
        setInputError(t('wizard.error.required'));
        return;
      }
      if (!answers.models.split(',').some((id) => id.trim())) {
        setInputError(t('wizard.error.models'));
        return;
      }
    }
    advance(step, answers);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && !submitting) {
      event.preventDefault();
      onCancel();
    }
  };

  let title = '';
  let prompt = '';
  let choices: AuthWizardChoice[] | undefined;
  let selected: string | undefined;
  let input:
    | { field: 'baseUrl' | 'apiKey' | 'models'; placeholder: string }
    | undefined;

  switch (step) {
    case 'provider':
      title = t('wizard.provider.title');
      prompt = t('wizard.provider.prompt');
      choices = providers.map((p) => ({
        value: p.id,
        label: p.label,
        description: p.description,
      }));
      selected = answers.providerId;
      break;
    case 'protocol':
      title = t('wizard.protocol.title');
      prompt = t('wizard.protocol.prompt');
      choices = provider?.protocols;
      selected = answers.protocol;
      break;
    case 'wireApi':
      title = t('wizard.wireApi.title');
      prompt = t('wizard.wireApi.prompt');
      choices = WIRE_API_CHOICES;
      selected = answers.wireApi;
      break;
    case 'baseUrl':
      if (provider?.baseUrl.kind === 'choice') {
        title = provider.baseUrl.stepTitle;
        prompt = t('wizard.endpoint.prompt');
        choices = provider.baseUrl.options;
        selected = answers.baseUrl;
      } else {
        title = t('wizard.baseUrl.title');
        prompt = t('wizard.baseUrl.prompt');
        input = {
          field: 'baseUrl',
          placeholder: provider ? baseUrlPlaceholder(provider, answers) : '',
        };
      }
      break;
    case 'apiKey':
      title = t('wizard.apiKey.title');
      prompt = t('wizard.apiKey.prompt');
      input = {
        field: 'apiKey',
        placeholder: provider?.apiKeyPlaceholder ?? 'sk-...',
      };
      break;
    case 'models':
      title = t('wizard.models.title');
      prompt = t('wizard.models.prompt');
      input = {
        field: 'models',
        placeholder: provider?.models?.join(',') || 'model-name',
      };
      break;
    case 'advanced':
      title = t('wizard.advanced.title');
      prompt = t('wizard.advanced.prompt');
      choices = [
        {
          value: 'yes',
          label: t('wizard.advanced.yes'),
          description: t('wizard.advanced.yesDescription'),
        },
        {
          value: 'no',
          label: t('wizard.advanced.no'),
          description: t('wizard.advanced.noDescription'),
        },
      ];
      selected =
        answers.enableThinking === undefined
          ? undefined
          : answers.enableThinking
            ? 'yes'
            : 'no';
      break;
    default:
      break;
  }

  const isLastStep = stepIndex === steps.length - 1;
  const shownError = inputError ?? error;
  const stepLabel = t('wizard.step')
    .replace('{current}', String(stepIndex + 1))
    .replace('{total}', String(steps.length));

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('wizard.title')}
      data-auth-wizard=""
      style={PANEL_STYLE}
      onKeyDown={onKeyDown}
    >
      <div
        style={{
          display: 'flex',
          width: 'min(100%, 360px)',
          flexDirection: 'column',
          gap: 12,
          margin: 'auto',
        }}
      >
        <div
          data-wizard-header=""
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          <WelcomeSeal size={40} />
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                lineHeight: '32px',
                letterSpacing: '-0.02em',
                background: TITLE_GRADIENT[theme],
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('onboarding.title')}
            </div>
            <div
              style={{
                marginTop: 4,
                color: 'var(--vscode-descriptionForeground)',
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              {t('wizard.title')}
            </div>
          </div>
        </div>
        <div>
          {/* The step count is known once a provider is picked. */}
          {provider && step !== 'provider' && (
            <div
              style={{
                color: 'var(--vscode-descriptionForeground)',
                fontSize: 11,
                lineHeight: 1.45,
              }}
            >
              {`${provider.label} · ${stepLabel}`}
            </div>
          )}
          <div style={{ marginTop: 2, fontSize: 15, fontWeight: 600 }}>
            {title}
          </div>
          <div
            style={{
              marginTop: 2,
              color: 'var(--vscode-descriptionForeground)',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            {prompt}
          </div>
        </div>

        {choices && (
          <div
            role="group"
            aria-label={title}
            style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            {choices.map((choice) => {
              const isSelected = choice.value === selected;
              return (
                <button
                  key={choice.value}
                  type="button"
                  data-wizard-option=""
                  aria-pressed={isSelected}
                  disabled={submitting}
                  className="qwen-vscode-wizard-option"
                  onClick={() => choose(choice.value)}
                  style={{
                    ...OPTION_STYLE,
                    ...(isSelected
                      ? {
                          borderColor: 'var(--vscode-focusBorder)',
                          background:
                            'var(--vscode-list-inactiveSelectionBackground)',
                        }
                      : {}),
                    cursor: submitting ? 'wait' : 'pointer',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{choice.label}</span>
                  {choice.description && (
                    <span
                      style={{
                        color: 'var(--vscode-descriptionForeground)',
                        fontSize: 11,
                        lineHeight: 1.45,
                      }}
                    >
                      {choice.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {input && (
          <input
            key={input.field}
            data-wizard-input=""
            aria-label={title}
            type={input.field === 'apiKey' ? 'password' : 'text'}
            autoComplete="off"
            spellCheck={false}
            disabled={submitting}
            placeholder={input.placeholder}
            value={answers[input.field]}
            onChange={(event) => {
              const value = event.target.value;
              setInputError(undefined);
              setAnswers((current) => ({ ...current, [input.field]: value }));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                confirmInput();
              }
            }}
            style={INPUT_STYLE}
          />
        )}

        {shownError && (
          <div
            role="alert"
            style={{
              color: 'var(--vscode-errorForeground)',
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            {shownError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {history.length > 1 && (
            <button
              type="button"
              disabled={submitting}
              onClick={back}
              style={{ ...SECONDARY_BUTTON_STYLE, marginRight: 'auto' }}
            >
              {t('wizard.back')}
            </button>
          )}
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            style={SECONDARY_BUTTON_STYLE}
          >
            {t('wizard.cancel')}
          </button>
          {(input || (submitting && isLastStep)) && (
            <button
              type="button"
              disabled={submitting}
              onClick={confirmInput}
              style={{
                ...PRIMARY_BUTTON_STYLE,
                cursor: submitting ? 'wait' : 'pointer',
                opacity: submitting ? 0.75 : 1,
              }}
            >
              {submitting && (
                <span
                  aria-hidden="true"
                  style={{
                    width: 11,
                    height: 11,
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'qwen-vscode-spin 0.8s linear infinite',
                  }}
                />
              )}
              {submitting
                ? t('wizard.connecting')
                : isLastStep
                  ? t('wizard.connect')
                  : t('wizard.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
