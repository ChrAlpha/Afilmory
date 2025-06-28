import { useTranslation } from 'react-i18next'
import { Outlet, useNavigate } from 'react-router'

import { Button } from '~/components/ui/button'

export default function ExploryLayout() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div className="relative h-screen w-full">
      {/* 返回按钮 */}
      <div className="absolute top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="h-10 w-10 rounded-full border border-white/20 bg-black/50 backdrop-blur-sm transition-all duration-200 hover:bg-black/70"
          title={t('explory.back.to.gallery')}
        >
          <i className="i-mingcute-arrow-left-line text-base text-white" />
        </Button>
      </div>

      <Outlet />
    </div>
  )
}
