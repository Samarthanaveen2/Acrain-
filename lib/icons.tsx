import {
  Atom,
  Biohazard,
  ChartLine,
  CodeXml,
  Flag,
  Microscope,
  ShieldAlert,
  Bot,
  BookOpen,
  Box,
  Brain,
  Briefcase,
  Building2,
  Car,
  Clapperboard,
  Code,
  Copy,
  Cpu,
  Database,
  DollarSign,
  Factory,
  FlaskConical,
  Gamepad2,
  Gavel,
  Globe,
  GraduationCap,
  Hammer,
  Heart,
  Image,
  Landmark,
  Lock,
  Megaphone,
  Music,
  PenTool,
  Plane,
  RefreshCw,
  Rocket,
  Scale,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Icons a topic can name in topic.json */
export const ICONS: Record<string, LucideIcon> = {
  atom: Atom,
  biohazard: Biohazard,
  "chart-line": ChartLine,
  "code-xml": CodeXml,
  flag: Flag,
  microscope: Microscope,
  "shield-alert": ShieldAlert,
  bot: Bot,
  book: BookOpen,
  box: Box,
  brain: Brain,
  briefcase: Briefcase,
  building: Building2,
  car: Car,
  film: Clapperboard,
  code: Code,
  copy: Copy,
  cpu: Cpu,
  database: Database,
  dollar: DollarSign,
  factory: Factory,
  lab: FlaskConical,
  gamepad: Gamepad2,
  gavel: Gavel,
  globe: Globe,
  school: GraduationCap,
  hammer: Hammer,
  heart: Heart,
  image: Image,
  landmark: Landmark,
  lock: Lock,
  megaphone: Megaphone,
  music: Music,
  pen: PenTool,
  plane: Plane,
  refresh: RefreshCw,
  rocket: Rocket,
  scale: Scale,
  shield: ShieldCheck,
  phone: Smartphone,
  sparkles: Sparkles,
  trending: TrendingUp,
  user: User,
  users: Users,
  wrench: Wrench,
  zap: Zap,
};

export const ICON_NAMES = Object.keys(ICONS);

type IconProps = {
  name?: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
  /** Position when nested inside another SVG */
  x?: number;
  y?: number;
};

export function Icon({ name, size = 16, className, strokeWidth = 2, x, y }: IconProps) {
  const C = name ? ICONS[name] : undefined;
  if (!C) return null;
  return <C size={size} className={className} strokeWidth={strokeWidth} x={x} y={y} aria-hidden />;
}
