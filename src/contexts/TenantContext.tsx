import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { applyTheme, TenantTheme } from '../lib/theme'

type TenantData = {
  id: string | null
  slug: string
  name: string
  theme: TenantTheme
  logoUrl: string | null
  loading: boolean
}

const TenantContext = createContext<TenantData>({
  id: null,
  slug: '',
  name: '',
  theme: {},
  logoUrl: null,
  loading: true,
})

export function TenantProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [data, setData] = useState<TenantData>({
    id: null,
    slug,
    name: slug,
    theme: {},
    logoUrl: null,
    loading: true,
  })

  useEffect(() => {
    // Tenant branding (name, theme, logo) must be available pre-auth so the
    // login page renders in the tenant's colors. RLS allows anon SELECT on
    // tenants for this reason.
    supabase
      .from('tenants')
      .select('id, slug, name, theme, logo_url')
      .eq('slug', slug)
      .single()
      .then(({ data: tenant, error }) => {
        console.log('[tenant] result:', { tenant, error })
        if (tenant) {
          const theme: TenantTheme = {
            primaryColor: tenant.theme?.primaryColor,
            secondaryColor: tenant.theme?.secondaryColor,
          }
          applyTheme(theme)
          setData({
            id: tenant.id,
            slug: tenant.slug,
            name: tenant.name,
            theme,
            logoUrl: tenant.logo_url,
            loading: false,
          })
        } else {
          setData((prev) => ({ ...prev, loading: false }))
        }
      })
  }, [slug])

  return <TenantContext.Provider value={data}>{children}</TenantContext.Provider>
}

export function useTenantData() {
  return useContext(TenantContext)
}
