import { useI18n, useT } from './i18n'

export default function SettingsPanel() {
  const { lang, setLang } = useI18n()
  const t = useT()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Language Setting */}
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🌐</span>
          <h2 className="text-lg font-bold text-text-primary">{t('settings.language')}</h2>
        </div>
        <p className="text-xs text-text-muted mb-3">{t('settings.language.desc')}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setLang('en')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${
              lang === 'en'
                ? 'bg-accent text-bg-primary border-accent'
                : 'bg-bg-primary text-text-muted border-border hover:border-accent hover:text-text-primary'
            }`}
          >
            <img src="https://flagcdn.com/w40/us.png" srcSet="https://flagcdn.com/w80/us.png 2x" alt="" className="w-6 h-4 shrink-0 rounded-[2px] object-cover" />
            {t('settings.language.en')}
          </button>
          <button
            onClick={() => setLang('he')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${
              lang === 'he'
                ? 'bg-accent text-bg-primary border-accent'
                : 'bg-bg-primary text-text-muted border-border hover:border-accent hover:text-text-primary'
            }`}
          >
            <img src="https://flagcdn.com/w40/il.png" srcSet="https://flagcdn.com/w80/il.png 2x" alt="" className="w-6 h-4 shrink-0 rounded-[2px] object-cover" />
            {t('settings.language.he')}
          </button>
        </div>
      </div>
    </div>
  )
}
