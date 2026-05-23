import {
  Clapperboard,
  Home,
  LayoutDashboard,
  Sparkles,
  SquarePlus,
  UserRound,
  Wallet,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type NavItem = {
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
};

export const appNavigation: NavItem[] = [
  { label: "Feed", href: "/feed", icon: Home },
  { label: "Tasks", href: "/tasks", icon: Clapperboard },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Upload", href: "/upload", icon: SquarePlus },
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Admin", href: "/admin", icon: LayoutDashboard },
];

export function AppBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-[5px] border border-cyan-200/20 bg-cyan-300/10">
        <Sparkles className="size-5 text-cyan-200" />
      </div>
      <div>
        <p className="text-base font-semibold leading-none">byte-earn</p>
        <p className="text-muted">Creator network</p>
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-white/10 bg-[#08101d]/88 p-4 backdrop-blur-xl lg:flex lg:flex-col">
      <AppBrand />
      <nav className="mt-8 flex flex-1 flex-col gap-2">
        {appNavigation.map((item, index) => (
          <a
            className={`flex items-center gap-3 rounded-[5px] px-3 py-3 font-medium transition ${
              index === 0
                ? "border border-cyan-200/20 bg-cyan-300/12 text-cyan-100"
                : "text-slate-300 hover:bg-white/8 hover:text-white"
            }`}
            href={item.href}
            key={item.label}
          >
            <item.icon className="size-5" />
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#08101d]/92 px-2 pb-3 pt-2 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {appNavigation.slice(0, 5).map((item, index) => (
          <a
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[5px] font-medium ${
              index === 0 ? "bg-cyan-300/12 text-cyan-100" : "text-slate-400"
            }`}
            href={item.href}
            key={item.label}
          >
            <item.icon className="size-5" />
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
