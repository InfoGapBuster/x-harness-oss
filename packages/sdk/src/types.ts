export interface XHarnessConfig {
  apiUrl: string;
  apiKey: string;
  timeout?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

export interface EngagementGate {
  id: string;
  xAccountId: string;
  postId: string;
  triggerType: string;
  actionType: string;
  template: string;
  link: string | null;
  requireLike: boolean;
  requireRepost: boolean;
  requireFollow: boolean;
  replyKeyword: string | null;
  pollingStrategy: string;
  estimatedCost: string;
  isActive: boolean;
  lineHarnessUrl: string | null;
  lineHarnessApiKey: string | null;
  lineHarnessTag: string | null;
  lineHarnessScenarioId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementGateDelivery {
  id: string;
  gateId: string;
  xUserId: string;
  xUsername: string | null;
  deliveredPostId: string | null;
  status: string;
  createdAt: string;
}

export interface Follower {
  id: string;
  xAccountId: string;
  xUserId: string;
  username: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  followerCount: number | null;
  followingCount: number | null;
  isFollowing: boolean;
  isFollowed: boolean;
  userId: string | null;
  metadata: Record<string, unknown>;
  firstSeenAt: string;
  unfollowedAt: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  xAccountId: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export interface ScheduledPost {
  id: string;
  xAccountId: string;
  text: string;
  mediaIds: string[] | null;
  scheduledAt: string;
  status: string;
  postedTweetId: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateGateInput {
  xAccountId: string;
  postId: string;
  triggerType: string;
  actionType: string;
  template: string;
  link?: string;
  requireLike?: boolean;
  requireRepost?: boolean;
  requireFollow?: boolean;
  replyKeyword?: string;
  lineHarnessUrl?: string;
  lineHarnessApiKey?: string;
  lineHarnessTag?: string;
  lineHarnessScenarioId?: string;
}
