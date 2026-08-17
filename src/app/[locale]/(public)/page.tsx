import { notFound } from "next/navigation";
import { HomeBlogSlider } from "@/components/public/home-blog-slider";
import { WorkspaceHub } from "@/components/public/workspace-hub";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);

  return (
    <>
      <HomeBlogSlider
        locale={locale}
        slider={dict.home.slider}
        blog={dict.blogPage}
      />
      <WorkspaceHub
        locale={locale}
        copy={dict.home}
        tools={dict.toolsPage.items}
      />
    </>
  );
}
