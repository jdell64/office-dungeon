export class Player {
  energy: number;
  stress: number;

  constructor(startEnergy: number, startStress: number) {
    this.energy = startEnergy;
    this.stress = startStress;
  }
}
