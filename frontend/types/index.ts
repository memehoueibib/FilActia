export type Profile = {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    bio?: string;
    created_at: string;
    email: string;
  };
  
  export type Post = {
    id: string;
    user_id: string;
    content: string;
    image_url?: string;
    created_at: string;
    profile?: Profile;
    comments_count?: number;
    likes_count?: number;
  };
  
  export type Comment = {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    profile?: Profile;
  };