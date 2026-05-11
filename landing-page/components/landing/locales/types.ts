export type ChatItem =
  | { kind: "msg"; from: "runner" | "host"; text: string; time: string; file?: true }
  | { kind: "divider"; text: string };

export type GigCardStrings = {
  title: string;
  company: string;
  date: string;
  location: string;
  category: string;
};

export type Translations = {
  nav: {
    joinWaitlist: string;
  };
  hero: {
    eyebrow: string;
    headlineLine1: string;
    headlineLine2: string;
    sub: string;
    runnerLabel: string;
    hostLabel: string;
    runnerHint: string;
    hostHint: string;
    cta: string;
  };
  whyKria: {
    sectionLabel: string;
    headline: string;
    headlineHighlight: string;
    chatHeader: string;
    chatSubtitle: string;
    replayBtn: string;
    thread: ChatItem[];
    stepsLabel: string;
    steps: [
      { n: string; title: string; sub: string },
      { n: string; title: string; sub: string },
      { n: string; title: string; sub: string },
    ];
    totalTimeLabel: string;
    totalTimeValue: string;
    vsLabel: string;
    vsValue: string;
    stats: [
      { value: string; unit: string; desc: string },
      { value: string; unit: string; desc: string },
      { value: string; unit: string; desc: string },
    ];
  };
  momentum: {
    sectionLabel: string;
    headline: string;
    headlineHighlight: string;
    sub: string;
    points: [string, string, string];
    bands: {
      Newcomer: string;
      Building: string;
      Reliable: string;
      Trusted:  string;
      Elite:    string;
      Legend:   string;
    };
  };
  grid: {
    sectionLabel: string;
    eyebrow: string;
    headline: string;
    headlineHighlight: string;
    sub: string;
    cta: string;
    features: [string, string, string];
  };
  features: {
    sectionLabel: string;
    headline: string;
    headlineHighlight: string;
    items: [
      { title: string; sub: string },
      { title: string; sub: string },
      { title: string; sub: string },
    ];
  };
  waitlist: {
    headline: string;
    headlineHighlight: string;
    sub: string;
    disclaimer: string;
  };
  form: {
    emailPlaceholder: string;
    commentPlaceholder: string;
    submitBtn: string;
    joiningBtn: string;
    errorEmail: string;
    successTitle: string;
    successSub: string;
  };
  footer: {
    privacy: string;
    terms: string;
    contact: string;
    copyright: string;
  };
  phone: {
    runnerHint: string;
    hostHint: string;
    apply: string;
    skip: string;
    next: string;
    spotsOpen: string;
  };
  gigCards: [GigCardStrings, GigCardStrings, GigCardStrings];
};
