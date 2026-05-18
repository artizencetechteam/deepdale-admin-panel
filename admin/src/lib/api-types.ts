export type Role = "viewer" | "editor" | "admin" | "superadmin";
export type LeadStatus = "new" | "contacted" | "qualified" | "closed";
export type LeadSource = "support-form" | "book-a-call";
export type MediaKind = "image" | "audio" | "svg" | "document";
export type MegaMenuColumn = "platforms" | "useCases" | "customers";
export type LayoutDirection = "left" | "right";
export type CapabilityColumn = "left" | "middle" | "right";
export type ProductFeatureColumn = "left" | "right";
export type PublicationStatus = "draft" | "published";
export type ActivityLogAction =
  | "create"
  | "update"
  | "delete"
  | "reorder"
  | "toggle_visibility"
  | "login"
  | "logout"
  | "set_password";

export type ApiEnvelope<T> = {
  data: T;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type Timestamped = {
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = Timestamped & {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
};

export type AuthState = {
  status: "loading" | "authenticated" | "anonymous";
  user: AdminUser | null;
  csrfToken: string | null;
};

export type DashboardLead = {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string | null;
  submittedAt: string;
  source: LeadSource;
  status: LeadStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardActivityEntry = {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  resourceLabel: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

export type DashboardSectionManager = {
  key: string;
  label: string;
  description: string;
  href: string;
  area: "landing" | "global";
  visibility: "visible" | "hidden" | "system";
  itemCount: number | null;
  sortOrder: number | null;
};

export type FrontendIntegrationEndpoint = {
  key: string;
  label: string;
  method: "GET" | "POST";
  path: string;
  auth: "public" | "admin-session";
  description: string;
};

export type DashboardOverviewResponse = {
  totalLeads: number;
  newLeads24h: number;
  totalSectionsActive: number;
  hiddenSections: number;
  contentItems: number;
  draftItems: number;
  recentLeads: DashboardLead[];
  recentActivity: DashboardActivityEntry[];
  sectionManagers: DashboardSectionManager[];
  quickActions: Array<{
    label: string;
    href: string;
  }>;
  frontendEndpoints: FrontendIntegrationEndpoint[];
  leadTrends: Array<{
    date: string;
    count: number;
  }>;
};

export type PreviewSessionEndpoint = {
  key: "home" | "navigation" | "footer";
  label: string;
  path: string;
  absoluteUrl: string;
};

export type PreviewSessionResponse = {
  token: string;
  expiresAt: string;
  requestedByUserId: string;
  endpoints: PreviewSessionEndpoint[];
};

export type ActivityLogEntry = {
  id: string;
  actorUserId: string | null;
  actorRole: string | null;
  actorName: string | null;
  actorEmail: string | null;
  action: ActivityLogAction;
  resourceType: string;
  resourceId: string | null;
  resourceLabel: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

export type SiteSettingsSocialLinks = {
  facebook?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  twitter?: string | null;
};

export type SiteSettingsRestrictedView = Timestamped & {
  siteName: string;
  logoUrl: string;
  contactEmail: string;
  copyrightText: string;
  socialLinks: SiteSettingsSocialLinks;
};

export type SiteSettingsAdminView = SiteSettingsRestrictedView & {
  chatSystemPrompt: string;
  chatModel: string;
};

export type HeroContentResponse = Timestamped & {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaLink: string;
  promptTemplates: string[];
  heroTabs: Array<{
    label: string;
    image: string | null;
    content: string | null;
  }>;
  heroHeading: string;
  heroBackgroundImage: string;
  heroDashboardImage: string;
};

export type ProductCard = Timestamped & {
  id: string;
  brand: string;
  image: string;
  title: string;
  description: string;
  gradientPreset: string;
  buttonGradientPreset: string;
  sortOrder: number;
  publicationStatus: PublicationStatus;
};

export type Partner = Timestamped & {
  id: string;
  name: string;
  logoUrl: string;
  sortOrder: number;
  isActive: boolean;
  publicationStatus: PublicationStatus;
};

export type VoiceScenario = Timestamped & {
  id: string;
  tag: string;
  title: string;
  description: string;
  image: string;
  script: string;
  sortOrder: number;
  publicationStatus: PublicationStatus;
};

export type AutomationEngine = Timestamped & {
  id: string;
  tag: string;
  title: string;
  bulletPoints: string[];
  ctaLabel: string;
  ctaLink: string;
  ctaGradientPreset: string;
  image: string;
  imageAlt: string;
  layoutDirection: LayoutDirection;
  sortOrder: number;
  publicationStatus: PublicationStatus;
};

export type CapabilityCard = Timestamped & {
  id: string;
  title: string;
  description: string;
  iconName: string;
  iconUrl?: string;
  column: CapabilityColumn;
  sortOrder: number;
  publicationStatus: PublicationStatus;
};

export type IndustryROI = Timestamped & {
  id: string;
  label: string;
  image: string;
  useCases: string[];
  cvr: string;
  secondaryMetric: string;
  audioLabel: string;
  audioDuration: string;
  audioFile?: string | null;
  sortOrder: number;
  publicationStatus: PublicationStatus;
};

export type ProcessStep = Timestamped & {
  id: string;
  label: string;
  title: string;
  description: string;
  sortOrder: number;
  publicationStatus: PublicationStatus;
};

export type ProductFeature = Timestamped & {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  column: ProductFeatureColumn;
  sortOrder: number;
  publicationStatus: PublicationStatus;
};

export type CallerProfile = Timestamped & {
  id: string;
  name: string;
  role: string;
  image: string;
  sampleLine: string;
  voicePitch: number;
  sortOrder: number;
  publicationStatus: PublicationStatus;
};

export type MediaAsset = Timestamped & {
  id: string;
  kind: MediaKind;
  filename: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  publicUrl: string;
  createdByUserId?: string | null;
};

export type FaqCategory = Timestamped & {
  id: string;
  label: string;
  sortOrder: number;
  publicationStatus: PublicationStatus;
};

export type FaqItem = Timestamped & {
  id: string;
  categoryId: string;
  categoryLabel: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  publicationStatus: PublicationStatus;
};

export type Testimonial = Timestamped & {
  id: string;
  quote: string;
  author: string;
  title: string;
  avatar?: string | null;
  rating?: number | null;
  sortOrder: number;
  isActive: boolean;
  publicationStatus: PublicationStatus;
};

export type RatingSummary = Timestamped & {
  score: string;
  reviewCount: string;
  starCount: number;
};

export type SupportFormConfig = Timestamped & {
  heading: string;
  subheading: string;
  checkItems: string[];
  submitButtonText: string;
  successMessage: string;
  privacyPolicyText: string;
  privacyPolicyUrl: string;
};

export type SectionConfig = {
  voiceAgentsHeading: string;
  voiceAgentsSubheading: string;
  voiceAgentsBodyText: string;
  automationHeading: string;
  automationSubheading: string;
  automationCtaBannerText: string;
  automationCtaBannerButton: string;
  modelCreationLine1: string;
  modelCreationLine2: string;
  modelCreationLine3: string;
  processStepsHeading: string;
  processStepsSubheading: string;
  productsOverviewHeading: string;
  productsOverviewSubheading: string;
  productFeaturesCenterImageUrl: string;
  callerShowcaseHeading: string;
  callerShowcaseSubheading: string;
  testimonialsHeading: string;
  faqHeading: string;
  integrationsHeading: string;
  integrationsSubheading: string;
  integrationsCtaText: string;
  partnershipHeading: string;
  roiBadgeText: string;
  roiHeading: string;
  footerTagline: string;
  footerBrandText: string;
  createdAt: string;
  updatedAt: string;
};

export type SectionConfigInput = Omit<SectionConfig, "createdAt" | "updatedAt">;

export type SectionState = {
  key: string;
  isVisible: boolean;
  sortOrder: number;
  updatedByUserId?: string | null;
  updatedAt: string;
};

export type NavigationItem = Timestamped & {
  id: string;
  label: string;
  href?: string | null;
  hasDropdown: boolean;
  sortOrder: number;
  publicationStatus: PublicationStatus;
};

export type Integration = Timestamped & {
  id: string;
  name: string;
  shortLabel: string;
  color: string;
  logoUrl?: string | null;
  row: number;
  sortOrder: number;
  isActive: boolean;
  publicationStatus: PublicationStatus;
};

export type MegaMenuItem = Timestamped & {
  id: string;
  column: MegaMenuColumn;
  title: string;
  description: string;
  iconName: string;
  iconColor: string;
  isNew: boolean;
  link?: string | null;
  sortOrder: number;
  publicationStatus: PublicationStatus;
};

export type FooterLink = {
  id: string;
  label: string;
  href: string;
  sortOrder: number;
};

export type FooterLinkInput = {
  label: string;
  href: string;
  sortOrder: number;
};

export type FooterLinkGroup = Timestamped & {
  id: string;
  heading: string;
  sortOrder: number;
  links: FooterLink[];
  publicationStatus: PublicationStatus;
};

export type LeadRecord = Timestamped & {
  id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string | null;
  submittedAt: string;
  source: LeadSource;
  status: LeadStatus;
  notes: string | null;
};

export type UiOptions = {
  gradientPresets: Array<{
    token: string;
    label: string;
    preview: string;
  }>;
  iconNames: string[];
};

export type LoginResponse = {
  user: AdminUser;
  csrfToken: string;
};
