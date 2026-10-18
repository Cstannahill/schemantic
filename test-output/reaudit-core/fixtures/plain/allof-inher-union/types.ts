export interface BasePet {
  id: number;
  name: string;
  age?: number | null | undefined;
}

export type Dog = BasePet & ({ breed: string; trained?: boolean | undefined; });

export type Cat = BasePet & ({ color?: string | undefined; indoor?: boolean | undefined; });

export type PetResponse = Dog | Cat;