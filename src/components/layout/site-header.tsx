import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { NavLinks } from "@/components/layout/nav-links";
import { SearchField } from "@/components/layout/search-field";
import { SiteLogo } from "@/components/layout/site-logo";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export function SiteHeader({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const search = (
    <SearchField
      locale={locale}
      label={dict.header.search}
      placeholder={dict.header.searchPlaceholder}
    />
  );

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:gap-6 lg:px-8">
        <SiteLogo locale={locale} brand={dict.brand} />

        <nav
          aria-label={dict.header.mainNav}
          className="hidden flex-1 justify-center lg:flex"
        >
          <NavLinks locale={locale} labels={dict.nav} />
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <div className="hidden md:block md:w-52 xl:w-64">{search}</div>
          <LanguageSwitcher locale={locale} label={dict.header.language} />
          <MobileMenu locale={locale} header={dict.header} nav={dict.nav}>
            {search}
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
