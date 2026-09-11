export function getHeldPenBarrelButtons(evt: PointerEvent): { primary: boolean; secondary: boolean } {
    if (evt.pointerType !== 'pen') return { primary: false, secondary: false };
    return {
      primary: (evt.buttons & 2) !== 0 || (evt.buttons & 32) !== 0,
      secondary: (evt.buttons & 4) !== 0,
    };
  }
  
  export function isPenBarrelButton(button: number): boolean {
    return button === 1 || button === 2 || button === 5;
  }