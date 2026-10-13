import { describeWindRelativeDirection } from './wind-relative-direction';

describe('describeWindRelativeDirection', () => {
  it('describeWindRelativeDirection_Headwind_ReturnsDownArrowAndHeadwindClass', () => {
    const result = describeWindRelativeDirection('Headwind');

    expect(result).toEqual({ symbol: '↓', label: 'Headwind', cssClass: 'headwind' });
  });

  it('describeWindRelativeDirection_Tailwind_ReturnsUpArrowAndTailwindClass', () => {
    const result = describeWindRelativeDirection('Tailwind');

    expect(result).toEqual({ symbol: '↑', label: 'Tailwind', cssClass: 'tailwind' });
  });

  it('describeWindRelativeDirection_Crosswind_ReturnsSidewaysArrowAndCrosswindClass', () => {
    const result = describeWindRelativeDirection('Crosswind');

    expect(result).toEqual({ symbol: '→', label: 'Crosswind', cssClass: 'crosswind' });
  });

  it('describeWindRelativeDirection_Null_ReturnsNull', () => {
    const result = describeWindRelativeDirection(null);

    expect(result).toBeNull();
  });
});
