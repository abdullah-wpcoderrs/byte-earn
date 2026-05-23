import { Clapperboard, ImageIcon, Music2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type MockPost = {
  author: string;
  avatar: string;
  badge: string;
  bookmarks: string;
  caption: string;
  comments: Array<[string, string]>;
  handle: string;
  icon: LucideIcon;
  id: string;
  likes: string;
  mediaUrl: string;
  type: "image_audio" | "image_text" | "video_text";
};

export const feedPosts: MockPost[] = [
  {
    id: "task-streak",
    author: "Amina Kareem",
    handle: "amina.creates",
    avatar: "AK",
    type: "image_audio",
    badge: "Image + MP3",
    caption: "Daily task streak cleared. Referral link is doing real work today.",
    mediaUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    likes: "12.4K",
    bookmarks: "2.1K",
    comments: [
      ["Maya B.", "This flow is clean. The payout proof helped."],
      ["David O.", "Copied the referral caption and shared it."],
    ],
    icon: Music2,
  },
  {
    id: "sponsored-video",
    author: "David Okon",
    handle: "david.moves",
    avatar: "DO",
    type: "video_text",
    badge: "Video",
    caption: "Sponsored watch milestone unlocked without showing a noisy timer.",
    mediaUrl: "https://images.unsplash.com/photo-1611162616475-46b635cb6868?auto=format&fit=crop&w=900&q=80",
    likes: "8.8K",
    bookmarks: "1.4K",
    comments: [
      ["Amina K.", "The toast-only reward moment feels better."],
      ["Tola S.", "Need this task in my dashboard."],
    ],
    icon: Clapperboard,
  },
  {
    id: "payout-proof",
    author: "Maya Bello",
    handle: "maya.studio",
    avatar: "MB",
    type: "image_text",
    badge: "Image",
    caption: "Bank profile verified. Referral earnings are unlocked anytime.",
    mediaUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=80",
    likes: "6.1K",
    bookmarks: "980",
    comments: [
      ["Amina K.", "This is the trust signal users need."],
      ["David O.", "Clean. No extra steps."],
    ],
    icon: ImageIcon,
  },
];

export const profileGridPosts: MockPost[] = [
  ...feedPosts,
  {
    id: "creator-tips",
    author: "Amina Kareem",
    handle: "amina.creates",
    avatar: "AK",
    type: "image_text",
    badge: "Image",
    caption: "Profile grids need to make post type obvious at a glance.",
    mediaUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
    likes: "4.7K",
    bookmarks: "760",
    comments: [],
    icon: ImageIcon,
  },
  {
    id: "audio-drop",
    author: "Amina Kareem",
    handle: "amina.creates",
    avatar: "AK",
    type: "image_audio",
    badge: "MP3",
    caption: "Audio-backed post with vinyl indicator.",
    mediaUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
    likes: "3.8K",
    bookmarks: "512",
    comments: [],
    icon: Music2,
  },
  {
    id: "referral-proof",
    author: "Amina Kareem",
    handle: "amina.creates",
    avatar: "AK",
    type: "video_text",
    badge: "Video",
    caption: "Referral share loop preview.",
    mediaUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=900&q=80",
    likes: "2.9K",
    bookmarks: "438",
    comments: [],
    icon: Clapperboard,
  },
];
