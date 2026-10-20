import type { Area } from '@/types'
import type { Component } from 'vue'
import {
  Baby, Bike, BookOpen, Briefcase, Building2, CalendarDays, Camera, Car, Code, Coffee, Dumbbell, Film,
  Flower2, Folder, Gamepad2, Gift, Globe, GraduationCap, Hammer, Heart, House, Landmark, Laptop, Leaf,
  Lightbulb, MapPin, Moon, Mountain, Music, Paintbrush, Palette, PawPrint, PiggyBank, Plane, Rocket, Shirt,
  ShoppingCart, Smartphone, Sprout, Star, Stethoscope, Sun, Target, Tent, TreePine, Trophy, Users,
  Utensils, Wallet, Wrench,
} from 'lucide-vue-next'

/** The icons a category can have – the key is what the server stores. 50 at most, so the picker stays one glance. */
export const AREA_ICONS: { key: string, icon: Component, label: string }[] = [
  { key: 'briefcase', icon: Briefcase, label: 'Praca' },
  { key: 'building', icon: Building2, label: 'Firma' },
  { key: 'laptop', icon: Laptop, label: 'Komputer' },
  { key: 'code', icon: Code, label: 'Kod' },
  { key: 'smartphone', icon: Smartphone, label: 'Telefon' },
  { key: 'landmark', icon: Landmark, label: 'Urząd' },
  { key: 'wallet', icon: Wallet, label: 'Finanse' },
  { key: 'piggy-bank', icon: PiggyBank, label: 'Oszczędności' },
  { key: 'target', icon: Target, label: 'Cele' },
  { key: 'rocket', icon: Rocket, label: 'Start' },
  { key: 'lightbulb', icon: Lightbulb, label: 'Pomysły' },
  { key: 'trophy', icon: Trophy, label: 'Osiągnięcia' },
  { key: 'house', icon: House, label: 'Dom' },
  { key: 'wrench', icon: Wrench, label: 'Naprawy' },
  { key: 'hammer', icon: Hammer, label: 'Remont' },
  { key: 'paintbrush', icon: Paintbrush, label: 'Malowanie' },
  { key: 'shopping-cart', icon: ShoppingCart, label: 'Zakupy' },
  { key: 'utensils', icon: Utensils, label: 'Kuchnia' },
  { key: 'coffee', icon: Coffee, label: 'Kawa' },
  { key: 'shirt', icon: Shirt, label: 'Ubrania' },
  { key: 'users', icon: Users, label: 'Rodzina' },
  { key: 'baby', icon: Baby, label: 'Dzieci' },
  { key: 'paw-print', icon: PawPrint, label: 'Zwierzęta' },
  { key: 'heart', icon: Heart, label: 'Bliscy' },
  { key: 'stethoscope', icon: Stethoscope, label: 'Zdrowie' },
  { key: 'dumbbell', icon: Dumbbell, label: 'Trening' },
  { key: 'bike', icon: Bike, label: 'Rower' },
  { key: 'mountain', icon: Mountain, label: 'Góry' },
  { key: 'tent', icon: Tent, label: 'Biwak' },
  { key: 'plane', icon: Plane, label: 'Podróże' },
  { key: 'car', icon: Car, label: 'Samochód' },
  { key: 'map-pin', icon: MapPin, label: 'Miejsca' },
  { key: 'globe', icon: Globe, label: 'Świat' },
  { key: 'book-open', icon: BookOpen, label: 'Książki' },
  { key: 'graduation-cap', icon: GraduationCap, label: 'Nauka' },
  { key: 'music', icon: Music, label: 'Muzyka' },
  { key: 'film', icon: Film, label: 'Filmy' },
  { key: 'gamepad', icon: Gamepad2, label: 'Gry' },
  { key: 'camera', icon: Camera, label: 'Zdjęcia' },
  { key: 'palette', icon: Palette, label: 'Sztuka' },
  { key: 'leaf', icon: Leaf, label: 'Natura' },
  { key: 'sprout', icon: Sprout, label: 'Ogród' },
  { key: 'tree', icon: TreePine, label: 'Las' },
  { key: 'flower', icon: Flower2, label: 'Kwiaty' },
  { key: 'sun', icon: Sun, label: 'Lato' },
  { key: 'moon', icon: Moon, label: 'Wieczór' },
  { key: 'calendar', icon: CalendarDays, label: 'Terminy' },
  { key: 'gift', icon: Gift, label: 'Prezenty' },
  { key: 'star', icon: Star, label: 'Ważne' },
  { key: 'folder', icon: Folder, label: 'Folder' },
]

/** The chosen icon, else a guess from the name ("Praca" → briefcase, "Dom" → house), else a folder. */
export function areaIcon (area: Pick<Area, 'name' | 'icon'>): Component {
  const chosen = AREA_ICONS.find(item => item.key === area.icon)

  if (chosen) {
    return chosen.icon
  }

  const name = area.name.toLowerCase()

  if (/prac|work|firm|biur/.test(name)) {
    return Briefcase
  }

  if (/dom|home|rodzin/.test(name)) {
    return House
  }

  return Folder
}
