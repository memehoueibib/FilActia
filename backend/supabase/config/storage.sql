INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true);

CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload an avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Post images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'posts');

CREATE POLICY "Anyone can upload a post image" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'posts');