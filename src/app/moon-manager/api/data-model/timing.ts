// Copyright Monwoo 2018, by Miguel Monwoo, service@monwoo.com
export class Timing {
  // https://stackoverflow.com/questions/30944763/typescript-looping-through-class-type-properties
  // values without assigments are not listed by Object.keys
  // assigning undefined will make it works...
  // API Fields
  id: number = undefined;
  DateTime: Date = undefined;
  EventSource: string = undefined;
  ExpertiseLevel: string = undefined;
  Project: string = undefined;
  SubProject: string = undefined;
  Objectif: string = undefined;
  Title: string = undefined;
  MediaUrl: string = undefined;
  Author: string = undefined;
  Comment: string = undefined;
  ReviewedComment: string = undefined;
  OverrideSequence: string = undefined;
  OverrideReduction: string = undefined;
  SegmentOverride: number = undefined;
  SegmentMin: Date = undefined;
  SegmentDeltaHr: number = undefined;
  SegmentMax: Date = undefined;
  Date: string = undefined;
  Time: string = undefined;
  Month: string = undefined;
  Year: string = undefined;
  SkillsId: string = undefined;
  // Client side computed fields :
  LinearWorkloadAmount: number = undefined;
  WorkloadAmount: number = undefined;
  TJM: number = undefined;
  TJMWorkloadByDay: number = undefined;
  Price: number = undefined;
  isHidden: boolean = undefined;
}
