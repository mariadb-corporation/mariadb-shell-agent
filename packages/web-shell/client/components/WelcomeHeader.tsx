import { useBrandName } from '../brandContext';
import { useI18n } from '../i18n';
import styles from './WelcomeHeader.module.css';
import { WelcomeSeal } from './WelcomeSeal';

export interface WelcomeHeaderProps {
  version: string;
  cwd: string;
  currentModel: string;
  currentMode: string;
  hideTips?: boolean;
}

export function WelcomeHeader(props: WelcomeHeaderProps) {
  void props;
  const { t } = useI18n();
  const brandName = useBrandName();

  return (
    <div className={styles.header}>
      <WelcomeSeal className={styles.seal} />
      <div className={styles.titleRow}>
        <span>{t('welcome.titlePrefix')}</span>
        <span className={styles.title}>{brandName}</span>
      </div>
      <div className={styles.subtitle}>{t('welcome.prompt')}</div>
    </div>
  );
}
