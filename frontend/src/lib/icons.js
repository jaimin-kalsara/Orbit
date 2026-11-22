import {
  Book, Briefcase, Code2, Coffee, Dumbbell, Folder, Gamepad2, GraduationCap, Heart, Home,
  Lightbulb, Music, Palette, Plane, ShoppingCart, Sparkles, Target, User, Wallet, Wrench,
} from 'lucide-react'

export const CATEGORY_ICONS = {
  folder: Folder,
  briefcase: Briefcase,
  user: User,
  heart: Heart,
  book: Book,
  code: Code2,
  dumbbell: Dumbbell,
  home: Home,
  wallet: Wallet,
  cart: ShoppingCart,
  plane: Plane,
  music: Music,
  palette: Palette,
  coffee: Coffee,
  target: Target,
  idea: Lightbulb,
  school: GraduationCap,
  game: Gamepad2,
  tools: Wrench,
  spark: Sparkles,
}

export const iconFor = (name) => CATEGORY_ICONS[name] || Folder
