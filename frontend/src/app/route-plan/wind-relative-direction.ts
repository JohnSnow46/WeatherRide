import { RouteSampleDto } from './route-plan-api.model';

export interface WindRelativeDirectionDisplay {
  symbol: string;
  label: string;
  cssClass: 'headwind' | 'crosswind' | 'tailwind';
}

/** Arrow relative to the rider's direction of travel (always "up" on the page): a
 * headwind blows from ahead (arrow points down, against travel), a tailwind pushes
 * from behind (arrow points up, with travel), a crosswind is sideways. */
export function describeWindRelativeDirection(
  direction: RouteSampleDto['windRelativeDirection']
): WindRelativeDirectionDisplay | null {
  switch (direction) {
    case 'Headwind':
      return { symbol: '↓', label: 'Headwind', cssClass: 'headwind' };
    case 'Crosswind':
      return { symbol: '→', label: 'Crosswind', cssClass: 'crosswind' };
    case 'Tailwind':
      return { symbol: '↑', label: 'Tailwind', cssClass: 'tailwind' };
    default:
      return null;
  }
}
