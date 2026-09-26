export const mockTeams = [
  'فريق تصميم الحدث',
  'فريق التسويق',
  'فريق إدارة المشروع',
  'فريق العمليات واللوجستيات',
  'فريق العلاقات العامة والشراكات',
  'فريق المالية',
  'فريق التقنية',
] as const;

export type MockTeamName = (typeof mockTeams)[number];

export type MockTeamId =
  | 'event-design'
  | 'marketing'
  | 'project-management'
  | 'operations-logistics'
  | 'public-relations-partnerships'
  | 'finance'
  | 'technology';

export const projectDecisionOptions = [
  {
    value: 'UNREVIEWED',
    label: 'بدون قرار',
  },
  {
    value: 'PRELIMINARY',
    label: 'ترشيح مبدئي',
  },
  {
    value: 'FINAL_NOMINATION',
    label: 'ترشيح نهائي',
  },
  {
    value: 'REJECTED',
    label: 'مرفوض',
  },
] as const;

export type ProjectDecisionStatus =
  (typeof projectDecisionOptions)[number]['value'];

export type TeamDecisionStatus =
  | 'PENDING'
  | 'PRELIMINARY_ACCEPTED'
  | 'FINAL_ACCEPTED'
  | 'REJECTED';

export type MockApplicantPreference = {
  teamId: MockTeamId;
  teamName: MockTeamName;
  priority: 1 | 2 | 3;
  reason?: string;
};

export type MockProjectDecision = {
  status: ProjectDecisionStatus;
  version: number;
  note?: string;
};

export type MockTeamDecision = {
  status: TeamDecisionStatus;
  version: number;
};

export type MockActiveNomination = {
  teamId: MockTeamId;
  teamName: MockTeamName;
  preferencePriority?: 1 | 2 | 3;
  teamDecision?: MockTeamDecision;
};

export type MockFormResponse = {
  label: string;
  value: string;
};

export type MockApplicant = {
  id: string;
  arabicName: string;
  studentId?: string;
  contact?: {
    phone?: string;
    email?: string;
    gender?: string;
  };
  academic?: {
    major?: string;
    academicYear?: string;
  };
  links?: {
    linkedIn?: string;
    portfolio?: string;
  };
  preferences: readonly MockApplicantPreference[];
  formResponses?: readonly MockFormResponse[];
  projectDecision?: MockProjectDecision;
  activeNominations?: readonly MockActiveNomination[];
};

export const mockApplicants: readonly MockApplicant[] = [
  {
    id: 'mock-applicant-001',
    arabicName: 'المرشح التجريبي ألف',
    studentId: '202400101',
    contact: {
      phone: '+966500000101',
      email: 'candidate.alpha@example.test',
      gender: 'ذكر',
    },
    academic: {
      major: 'علوم الحاسب',
      academicYear: 'السنة الثالثة',
    },
    links: {
      linkedIn: 'https://www.linkedin.com/in/mock-candidate-alpha',
      portfolio: 'https://example.test/portfolio/alpha',
    },
    preferences: [
      {
        teamId: 'technology',
        teamName: 'فريق التقنية',
        priority: 1,
        reason: 'أرغب في توظيف خبرتي في تطوير الواجهات وبناء حلول تخدم تجربة أعضاء كـورة.',
      },
      {
        teamId: 'event-design',
        teamName: 'فريق تصميم الحدث',
        priority: 2,
        reason: 'أهتم بتحويل الأفكار إلى تجارب مرئية واضحة للزوار.',
      },
      {
        teamId: 'marketing',
        teamName: 'فريق التسويق',
        priority: 3,
        reason: 'لدي اهتمام بصناعة محتوى بسيط وموجه للجمهور الجامعي.',
      },
    ],
    formResponses: [
      {
        label: 'علاقتك بكرة القدم',
        value: 'أتابع كرة القدم السعودية وأهتم بتطورها وتأثيرها على المجتمع والاقتصاد.',
      },
      {
        label: 'سبب رغبتك بالانضمام إلى كـورة',
        value: 'أريد المساهمة في مشروع يربط كرة القدم بالمجالات الإبداعية والتقنية.',
      },
      {
        label: 'الخبرات السابقة',
        value: 'شاركت في مشاريع طلابية لتصميم وتطوير مواقع تنظيم الفعاليات.',
      },
      {
        label: 'المهارات التي يمكن الاستفادة منها',
        value: 'React، TypeScript، تصميم واجهات المستخدم، والعمل ضمن فرق متعددة التخصصات.',
      },
    ],
    projectDecision: {
      status: 'UNREVIEWED',
      version: 1,
    },
  },
  {
    id: 'mock-applicant-002',
    arabicName: 'المرشح التجريبي باء',
    studentId: '202400102',
    contact: {
      email: 'candidate.beta@example.test',
      gender: 'أنثى',
    },
    academic: {
      major: 'التسويق',
      academicYear: 'السنة الثانية',
    },
    preferences: [
      {
        teamId: 'marketing',
        teamName: 'فريق التسويق',
        priority: 1,
        reason: 'أرغب في بناء حملات تعكس هوية الحدث وتخاطب الطلاب بلغة قريبة منهم.',
      },
      {
        teamId: 'public-relations-partnerships',
        teamName: 'فريق العلاقات العامة والشراكات',
        priority: 2,
        reason: 'أهتم بالتواصل مع الجهات المختلفة وبناء علاقات مهنية مستمرة.',
      },
      {
        teamId: 'finance',
        teamName: 'فريق المالية',
        priority: 3,
        reason: 'أرغب في اكتساب خبرة في تنظيم الميزانيات ومتابعة الاحتياجات.',
      },
    ],
    formResponses: [
      {
        label: 'علاقتك بكرة القدم',
        value: 'أتابع المباريات الكبرى وأهتم بالجانب الجماهيري والإعلامي في الرياضة.',
      },
      {
        label: 'سبب رغبتك بالانضمام إلى كـورة',
        value: 'لأن الفكرة تجمع بين كرة القدم وصناعة المحتوى بطريقة مختلفة داخل الجامعة.',
      },
      {
        label: 'الخبرات السابقة',
        value: 'عملت في لجان تسويق لفعاليات طلابية صغيرة.',
      },
      {
        label: 'المهارات التي يمكن الاستفادة منها',
        value: 'كتابة المحتوى، تنظيم الحملات، التواصل، وإدارة حسابات التواصل الاجتماعي.',
      },
    ],
    projectDecision: {
      status: 'PRELIMINARY',
      version: 2,
      note: 'يُستكمل تقييم الملاءمة النهائية مع فريق التسويق.',
    },
    activeNominations: [
      {
        teamId: 'marketing',
        teamName: 'فريق التسويق',
        preferencePriority: 1,
        teamDecision: {
          status: 'PENDING',
          version: 1,
        },
      },
    ],
  },
  {
    id: 'mock-applicant-003',
    arabicName: 'المرشح التجريبي جيم',
    studentId: '202400103',
    contact: {
      phone: '+966500000103',
      email: 'candidate.gamma@example.test',
      gender: 'ذكر',
    },
    academic: {
      major: 'إدارة الأعمال',
      academicYear: 'السنة الرابعة',
    },
    links: {
      linkedIn: 'https://www.linkedin.com/in/mock-candidate-gamma',
    },
    preferences: [
      {
        teamId: 'project-management',
        teamName: 'فريق إدارة المشروع',
        priority: 1,
        reason: 'أرغب في تطوير مهارات التخطيط والتنسيق بين فرق المشروع.',
      },
      {
        teamId: 'operations-logistics',
        teamName: 'فريق العمليات واللوجستيات',
        priority: 2,
        reason: 'أستمتع بتنظيم التفاصيل التشغيلية وضمان سير الفعاليات بسلاسة.',
      },
      {
        teamId: 'technology',
        teamName: 'فريق التقنية',
        priority: 3,
        reason: 'لدي اهتمام بالمنتجات الرقمية التي تدعم التشغيل.',
      },
    ],
    formResponses: [
      {
        label: 'علاقتك بكرة القدم',
        value: 'مهتم بإدارة المشاريع الرياضية وبكيفية تشغيل الفعاليات المرتبطة بها.',
      },
      {
        label: 'سبب رغبتك بالانضمام إلى كـورة',
        value: 'أرى في كـورة فرصة عملية لبناء مشروع متكامل من التخطيط حتى التنفيذ.',
      },
      {
        label: 'الخبرات السابقة',
        value: 'قدت فريقًا طلابيًا لتنظيم مبادرة جامعية متعددة المسارات.',
      },
      {
        label: 'المهارات التي يمكن الاستفادة منها',
        value: 'إدارة المشاريع، ترتيب الأولويات، التنسيق بين الفرق، وإعداد التقارير.',
      },
    ],
    projectDecision: {
      status: 'FINAL_NOMINATION',
      version: 4,
      note: 'مرشح نهائي مع إمكانية الاستفادة منه في أكثر من نطاق.',
    },
    activeNominations: [
      {
        teamId: 'project-management',
        teamName: 'فريق إدارة المشروع',
        preferencePriority: 1,
        teamDecision: {
          status: 'PRELIMINARY_ACCEPTED',
          version: 2,
        },
      },
      {
        teamId: 'operations-logistics',
        teamName: 'فريق العمليات واللوجستيات',
        preferencePriority: 2,
        teamDecision: {
          status: 'FINAL_ACCEPTED',
          version: 3,
        },
      },
    ],
  },
  {
    id: 'mock-applicant-004',
    arabicName: 'المرشح التجريبي دال',
    studentId: '202400104',
    contact: {
      phone: '+966500000104',
      email: 'candidate.delta@example.test',
    },
    academic: {
      major: 'التصميم',
      academicYear: 'السنة الثالثة',
    },
    links: {
      portfolio: 'https://example.test/portfolio/delta',
    },
    preferences: [
      {
        teamId: 'event-design',
        teamName: 'فريق تصميم الحدث',
        priority: 1,
        reason: 'أرغب في تصميم عناصر تعزز تجربة الزائر وتخدم مسارات الفعالية.',
      },
      {
        teamId: 'marketing',
        teamName: 'فريق التسويق',
        priority: 2,
        reason: 'أهتم بالهوية البصرية للمحتوى الرقمي والتواصل مع الجمهور.',
      },
      {
        teamId: 'public-relations-partnerships',
        teamName: 'فريق العلاقات العامة والشراكات',
        priority: 3,
        reason: 'أرغب في فهم احتياجات الشركاء وتحويلها إلى مواد واضحة.',
      },
    ],
    formResponses: [
      {
        label: 'علاقتك بكرة القدم',
        value: 'أهتم بالتصميم الرياضي وبالتجارب البصرية المرتبطة بالجماهير.',
      },
      {
        label: 'سبب رغبتك بالانضمام إلى كـورة',
        value: 'أريد تطبيق مهاراتي التصميمية في فعالية ذات موضوع مختلف ومؤثر.',
      },
      {
        label: 'الخبرات السابقة',
        value: 'أنجزت هويات ومواد رقمية لعدة أنشطة طلابية.',
      },
      {
        label: 'المهارات التي يمكن الاستفادة منها',
        value: 'Figma، التصميم الطباعي، بناء الأنظمة البصرية، وإعداد المطبوعات.',
      },
    ],
    projectDecision: {
      status: 'REJECTED',
      version: 2,
      note: 'لا توجد ملاءمة كافية للنطاق الحالي للمشروع.',
    },
  },
  {
    id: 'mock-applicant-005',
    arabicName: 'المرشح التجريبي هاء',
    studentId: '202400105',
    contact: {
      phone: '+966500000105',
      gender: 'ذكر',
    },
    academic: {
      major: 'المحاسبة',
      academicYear: 'السنة الثانية',
    },
    preferences: [
      {
        teamId: 'finance',
        teamName: 'فريق المالية',
        priority: 1,
        reason: 'أرغب في تطبيق ما أدرسه على احتياجات مالية حقيقية في مشروع طلابي.',
      },
      {
        teamId: 'technology',
        teamName: 'فريق التقنية',
        priority: 2,
        reason: 'أهتم بالأدوات الرقمية التي تساعد على تنظيم البيانات المالية.',
      },
      {
        teamId: 'project-management',
        teamName: 'فريق إدارة المشروع',
        priority: 3,
        reason: 'أرغب في اكتساب فهم أوسع لدورة المشروع واحتياجات الفرق.',
      },
    ],
    formResponses: [
      {
        label: 'علاقتك بكرة القدم',
        value: 'أتابع كرة القدم محليًا وأهتم بقراءة الأثر المالي للقطاع الرياضي.',
      },
      {
        label: 'سبب رغبتك بالانضمام إلى كـورة',
        value: 'لأنها فرصة لفهم الجانب الاقتصادي والتشغيلي للمشاريع الرياضية.',
      },
      {
        label: 'الخبرات السابقة',
        value: 'شاركت في تنظيم ميزانية لنادٍ طلابي خلال فصل دراسي.',
      },
      {
        label: 'المهارات التي يمكن الاستفادة منها',
        value: 'Excel، تنظيم المصروفات، إعداد الجداول، والدقة في المتابعة.',
      },
    ],
    projectDecision: {
      status: 'UNREVIEWED',
      version: 1,
    },
  },
  {
    id: 'mock-applicant-006',
    arabicName: 'المرشح التجريبي واو',
    contact: {
      email: 'candidate.waw@example.test',
      gender: 'أنثى',
    },
    academic: {
      major: 'الهندسة الصناعية',
      academicYear: 'السنة الثالثة',
    },
    preferences: [
      {
        teamId: 'operations-logistics',
        teamName: 'فريق العمليات واللوجستيات',
        priority: 1,
        reason: 'أفضل الأعمال التي تعتمد على تنظيم الموارد وتحسين تدفق المهام.',
      },
      {
        teamId: 'public-relations-partnerships',
        teamName: 'فريق العلاقات العامة والشراكات',
        priority: 2,
        reason: 'أهتم بتنسيق احتياجات الجهات المشاركة مع فرق التنفيذ.',
      },
      {
        teamId: 'event-design',
        teamName: 'فريق تصميم الحدث',
        priority: 3,
        reason: 'أرغب في المساهمة في تحسين تجربة الزائر داخل مساحة الفعالية.',
      },
    ],
    formResponses: [
      {
        label: 'علاقتك بكرة القدم',
        value: 'أتابع الأحداث الرياضية الكبرى وأهتم بكيفية تنظيم التجربة الجماهيرية.',
      },
      {
        label: 'سبب رغبتك بالانضمام إلى كـورة',
        value: 'لتحويل مهاراتي الهندسية إلى أثر ملموس في فعالية طلابية.',
      },
      {
        label: 'الخبرات السابقة',
        value: 'شاركت في تخطيط مسارات الزوار لفعالية داخل الحرم الجامعي.',
      },
      {
        label: 'المهارات التي يمكن الاستفادة منها',
        value: 'تحليل العمليات، التنظيم، إدارة الوقت، وحل المشكلات.',
      },
    ],
    projectDecision: {
      status: 'PRELIMINARY',
      version: 2,
    },
    activeNominations: [
      {
        teamId: 'operations-logistics',
        teamName: 'فريق العمليات واللوجستيات',
        preferencePriority: 1,
        teamDecision: {
          status: 'PENDING',
          version: 1,
        },
      },
    ],
  },
  {
    id: 'mock-applicant-007',
    arabicName: 'المرشح التجريبي زاي',
    studentId: '202400107',
    contact: {
      phone: '+966500000107',
      email: 'candidate.zay@example.test',
      gender: 'ذكر',
    },
    academic: {
      major: 'هندسة البرمجيات',
      academicYear: 'السنة الرابعة',
    },
    links: {
      linkedIn: 'https://www.linkedin.com/in/mock-candidate-zay',
      portfolio: 'https://example.test/portfolio/zay',
    },
    preferences: [
      {
        teamId: 'technology',
        teamName: 'فريق التقنية',
        priority: 1,
        reason: 'أرغب في بناء أدوات داخلية تسهّل إدارة البيانات والعمليات.',
      },
      {
        teamId: 'finance',
        teamName: 'فريق المالية',
        priority: 2,
        reason: 'لدي اهتمام بأتمتة التقارير ومتابعة البيانات المالية.',
      },
      {
        teamId: 'marketing',
        teamName: 'فريق التسويق',
        priority: 3,
        reason: 'أرغب في دعم التجارب الرقمية التي تظهر للجمهور.',
      },
    ],
    formResponses: [
      {
        label: 'علاقتك بكرة القدم',
        value: 'أتابع كرة القدم السعودية وأهتم باستخدام التقنية في تطوير تجربة الجمهور.',
      },
      {
        label: 'سبب رغبتك بالانضمام إلى كـورة',
        value: 'للمساهمة في بناء أدوات عملية تساعد فرق المشروع على العمل بوضوح.',
      },
      {
        label: 'الخبرات السابقة',
        value: 'طورت لوحات داخلية ومواقع صغيرة لمشاريع طلابية.',
      },
      {
        label: 'المهارات التي يمكن الاستفادة منها',
        value: 'TypeScript، قواعد البيانات، بناء الواجهات، والتعاون التقني.',
      },
    ],
    projectDecision: {
      status: 'FINAL_NOMINATION',
      version: 5,
    },
    activeNominations: [
      {
        teamId: 'technology',
        teamName: 'فريق التقنية',
        preferencePriority: 1,
        teamDecision: {
          status: 'FINAL_ACCEPTED',
          version: 4,
        },
      },
      {
        teamId: 'finance',
        teamName: 'فريق المالية',
        preferencePriority: 2,
        teamDecision: {
          status: 'PRELIMINARY_ACCEPTED',
          version: 2,
        },
      },
    ],
  },
  {
    id: 'mock-applicant-008',
    arabicName: 'المرشح التجريبي حاء',
    studentId: '202400108',
    contact: {
      phone: '+966500000108',
      email: 'candidate.haa@example.test',
    },
    academic: {
      major: 'الاتصال والإعلام',
      academicYear: 'السنة الثانية',
    },
    preferences: [
      {
        teamId: 'public-relations-partnerships',
        teamName: 'فريق العلاقات العامة والشراكات',
        priority: 1,
        reason: 'أرغب في تطوير مهارة بناء العلاقات وكتابة الرسائل المهنية.',
      },
      {
        teamId: 'project-management',
        teamName: 'فريق إدارة المشروع',
        priority: 2,
        reason: 'أهتم بتنسيق التواصل بين الفرق وإدارة الأولويات.',
      },
      {
        teamId: 'operations-logistics',
        teamName: 'فريق العمليات واللوجستيات',
        priority: 3,
        reason: 'أرغب في فهم تفاصيل التنفيذ داخل الفعاليات.',
      },
    ],
    formResponses: [
      {
        label: 'علاقتك بكرة القدم',
        value: 'أتابع القصص الإنسانية والإعلامية حول كرة القدم أكثر من الجانب الفني.',
      },
      {
        label: 'سبب رغبتك بالانضمام إلى كـورة',
        value: 'أرى في كـورة فرصة لتطبيق مهارات التواصل في محتوى وفعالية رياضية.',
      },
      {
        label: 'الخبرات السابقة',
        value: 'شاركت في إعداد تغطيات إعلامية لأنشطة جامعية.',
      },
      {
        label: 'المهارات التي يمكن الاستفادة منها',
        value: 'كتابة الرسائل، المقابلات، التنسيق الإعلامي، وإدارة التواصل.',
      },
    ],
    projectDecision: {
      status: 'REJECTED',
      version: 3,
    },
  },
  {
    id: 'mock-applicant-009',
    arabicName: 'المرشح التجريبي طاء',
    studentId: '202400109',
    contact: {
      email: 'candidate.taa@example.test',
      gender: 'ذكر',
    },
    academic: {
      major: 'نظم المعلومات الإدارية',
      academicYear: 'السنة الثالثة',
    },
    links: {
      portfolio: 'https://example.test/portfolio/taa',
    },
    preferences: [
      {
        teamId: 'marketing',
        teamName: 'فريق التسويق',
        priority: 1,
        reason: 'أهتم بتحليل تفاعل الجمهور وبناء رسائل تسويقية مدروسة.',
      },
      {
        teamId: 'technology',
        teamName: 'فريق التقنية',
        priority: 2,
        reason: 'أرغب في فهم كيفية تحويل البيانات إلى أدوات مفيدة للفرق.',
      },
      {
        teamId: 'operations-logistics',
        teamName: 'فريق العمليات واللوجستيات',
        priority: 3,
        reason: 'أستطيع المساهمة في تنسيق المهام ومتابعة تنفيذها.',
      },
    ],
    formResponses: [
      {
        label: 'علاقتك بكرة القدم',
        value: 'أهتم بالبيانات الرياضية وبكيفية قراءة سلوك الجمهور.',
      },
      {
        label: 'سبب رغبتك بالانضمام إلى كـورة',
        value: 'لأنها تجمع بين اهتمامي بالبيانات والعمل الجماعي والرياضة.',
      },
      {
        label: 'الخبرات السابقة',
        value: 'نفذت مشروعًا جامعيًا بسيطًا لتحليل تفاعل مستخدمين مع محتوى رقمي.',
      },
      {
        label: 'المهارات التي يمكن الاستفادة منها',
        value: 'تحليل البيانات، Excel، SQL، وتنظيم المتطلبات.',
      },
    ],
    projectDecision: {
      status: 'UNREVIEWED',
      version: 1,
    },
  },
  {
    id: 'mock-applicant-010',
    arabicName: 'المرشح التجريبي ياء',
    studentId: '202400110',
    contact: {
      phone: '+966500000110',
      email: 'candidate.yaa@example.test',
      gender: 'أنثى',
    },
    academic: {
      major: 'المالية',
      academicYear: 'السنة الرابعة',
    },
    links: {
      linkedIn: 'https://www.linkedin.com/in/mock-candidate-yaa',
    },
    preferences: [
      {
        teamId: 'project-management',
        teamName: 'فريق إدارة المشروع',
        priority: 1,
        reason: 'أرغب في العمل ضمن فريق يربط الأهداف والموارد والتنفيذ.',
      },
      {
        teamId: 'event-design',
        teamName: 'فريق تصميم الحدث',
        priority: 2,
        reason: 'أهتم بتقديم تجربة منظمة وواضحة للزوار والشركاء.',
      },
      {
        teamId: 'finance',
        teamName: 'فريق المالية',
        priority: 3,
        reason: 'أرغب في تطبيق المعرفة المالية ضمن ميزانيات وأنشطة فعلية.',
      },
    ],
    formResponses: [
      {
        label: 'علاقتك بكرة القدم',
        value: 'أهتم بالنمو الاقتصادي للرياضة وبالمشاريع التي تدعم هذا القطاع.',
      },
      {
        label: 'سبب رغبتك بالانضمام إلى كـورة',
        value: 'لأن المشروع يقدم زاوية متكاملة لكرة القدم تتجاوز متابعة المباريات.',
      },
      {
        label: 'الخبرات السابقة',
        value: 'شاركت في إدارة موارد مبادرة طلابية ومتابعة احتياجاتها المالية.',
      },
      {
        label: 'المهارات التي يمكن الاستفادة منها',
        value: 'التخطيط المالي، إدارة الأولويات، كتابة التقارير، والتنسيق.',
      },
    ],
    projectDecision: {
      status: 'FINAL_NOMINATION',
      version: 4,
      note: 'مرشحة نهائية، مع أولوية للاستفادة منها في إدارة المشروع.',
    },
    activeNominations: [
      {
        teamId: 'project-management',
        teamName: 'فريق إدارة المشروع',
        preferencePriority: 1,
        teamDecision: {
          status: 'FINAL_ACCEPTED',
          version: 2,
        },
      },
    ],
  },
];