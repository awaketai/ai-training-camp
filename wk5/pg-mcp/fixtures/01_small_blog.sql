-- ============================================================================
-- 小规模测试数据库：博客系统 (Blog System)
-- 规模：8张表，2个枚举类型，约500条测试数据
-- ============================================================================

-- 删除数据库（如果存在）
DROP DATABASE IF EXISTS blog_small;

-- 创建数据库
CREATE DATABASE blog_small;

-- 连接到数据库
\c blog_small

-- ============================================================================
-- 1. 枚举类型定义
-- ============================================================================

-- 用户角色
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'author', 'reader');

-- 文章状态
CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived');

COMMENT ON TYPE user_role IS '用户角色：管理员、编辑、作者、读者';
COMMENT ON TYPE post_status IS '文章状态：草稿、已发布、已归档';

-- ============================================================================
-- 2. 表结构定义
-- ============================================================================

-- 用户表
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'reader',
    full_name VARCHAR(100),
    avatar_url VARCHAR(255),
    bio TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.username IS '用户名';
COMMENT ON COLUMN users.email IS '邮箱地址';
COMMENT ON COLUMN users.role IS '用户角色';
COMMENT ON COLUMN users.bio IS '个人简介';

-- 分类表
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE categories IS '文章分类表';
COMMENT ON COLUMN categories.slug IS 'URL友好的标识符';
COMMENT ON COLUMN categories.parent_id IS '父分类ID（支持多级分类）';

-- 标签表
CREATE TABLE tags (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(30) NOT NULL UNIQUE,
    slug VARCHAR(30) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE tags IS '文章标签表';

-- 文章表
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt VARCHAR(500),
    author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL,
    status post_status NOT NULL DEFAULT 'draft',
    view_count INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE posts IS '文章表';
COMMENT ON COLUMN posts.excerpt IS '文章摘要';
COMMENT ON COLUMN posts.view_count IS '浏览次数';
COMMENT ON COLUMN posts.like_count IS '点赞数';

-- 文章标签关联表
CREATE TABLE post_tags (
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, tag_id)
);

COMMENT ON TABLE post_tags IS '文章标签关联表（多对多关系）';

-- 评论表
CREATE TABLE comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_approved BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE comments IS '评论表';
COMMENT ON COLUMN comments.parent_id IS '父评论ID（支持评论回复）';
COMMENT ON COLUMN comments.is_approved IS '是否已审核通过';

-- 用户收藏表
CREATE TABLE favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, post_id)
);

COMMENT ON TABLE favorites IS '用户收藏的文章';

-- 阅读历史表
CREATE TABLE reading_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_duration_seconds INTEGER
);

COMMENT ON TABLE reading_history IS '用户阅读历史记录';
COMMENT ON COLUMN reading_history.read_duration_seconds IS '阅读时长（秒）';

-- ============================================================================
-- 3. 索引定义
-- ============================================================================

-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 文章表索引
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_category_id ON posts(category_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published_at ON posts(published_at DESC);
CREATE INDEX idx_posts_view_count ON posts(view_count DESC);
CREATE INDEX idx_posts_title_gin ON posts USING gin(to_tsvector('english', title));
CREATE INDEX idx_posts_content_gin ON posts USING gin(to_tsvector('english', content));

-- 评论表索引
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- 收藏表索引
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_post_id ON favorites(post_id);

-- 阅读历史索引
CREATE INDEX idx_reading_history_user_id ON reading_history(user_id);
CREATE INDEX idx_reading_history_post_id ON reading_history(post_id);
CREATE INDEX idx_reading_history_read_at ON reading_history(read_at DESC);

-- ============================================================================
-- 4. 视图定义
-- ============================================================================

-- 文章详情视图（包含作者和分类信息）
CREATE VIEW post_details AS
SELECT
    p.id,
    p.title,
    p.slug,
    p.content,
    p.excerpt,
    p.status,
    p.view_count,
    p.like_count,
    p.published_at,
    p.created_at,
    p.updated_at,
    u.username AS author_username,
    u.full_name AS author_full_name,
    u.avatar_url AS author_avatar,
    c.name AS category_name,
    c.slug AS category_slug
FROM posts p
JOIN users u ON p.author_id = u.id
LEFT JOIN categories c ON p.category_id = c.id;

COMMENT ON VIEW post_details IS '文章详情视图（包含作者和分类信息）';

-- 用户统计视图
CREATE VIEW user_stats AS
SELECT
    u.id,
    u.username,
    u.full_name,
    u.role,
    COUNT(DISTINCT p.id) AS post_count,
    COUNT(DISTINCT c.id) AS comment_count,
    COUNT(DISTINCT f.id) AS favorite_count,
    MAX(p.published_at) AS last_post_date
FROM users u
LEFT JOIN posts p ON u.id = p.author_id AND p.status = 'published'
LEFT JOIN comments c ON u.id = c.user_id
LEFT JOIN favorites f ON u.id = f.user_id
GROUP BY u.id, u.username, u.full_name, u.role;

COMMENT ON VIEW user_stats IS '用户统计信息视图';

-- ============================================================================
-- 5. 测试数据生成
-- ============================================================================

-- 插入用户数据 (50个用户)
INSERT INTO users (username, email, password_hash, role, full_name, bio, last_login_at) VALUES
    ('admin', 'admin@blog.com', 'hash_admin', 'admin', 'Blog Administrator', 'System administrator', NOW() - INTERVAL '1 hour'),
    ('alice', 'alice@example.com', 'hash_alice', 'author', 'Alice Johnson', 'Tech writer and blogger', NOW() - INTERVAL '2 hours'),
    ('bob', 'bob@example.com', 'hash_bob', 'author', 'Bob Smith', 'Data science enthusiast', NOW() - INTERVAL '3 hours'),
    ('carol', 'carol@example.com', 'hash_carol', 'editor', 'Carol Williams', 'Content editor', NOW() - INTERVAL '4 hours'),
    ('david', 'david@example.com', 'hash_david', 'author', 'David Brown', 'Software developer', NOW() - INTERVAL '5 hours');

-- 批量生成更多用户
INSERT INTO users (username, email, password_hash, role, full_name, created_at)
SELECT
    'user' || i,
    'user' || i || '@example.com',
    'hash_user' || i,
    CASE WHEN i % 10 = 0 THEN 'author'::user_role ELSE 'reader'::user_role END,
    'User ' || i,
    NOW() - (i || ' days')::INTERVAL
FROM generate_series(6, 50) AS i;

-- 插入分类数据
INSERT INTO categories (name, slug, description, parent_id) VALUES
    ('Technology', 'technology', 'Technology articles', NULL),
    ('Programming', 'programming', 'Programming tutorials', 1),
    ('Database', 'database', 'Database related topics', 2),
    ('Web Development', 'web-development', 'Web development articles', 2),
    ('Lifestyle', 'lifestyle', 'Lifestyle articles', NULL),
    ('Travel', 'travel', 'Travel stories', 5),
    ('Food', 'food', 'Food and recipes', 5),
    ('Science', 'science', 'Science articles', NULL),
    ('AI & ML', 'ai-ml', 'Artificial Intelligence and Machine Learning', 1),
    ('DevOps', 'devops', 'DevOps practices', 2);

-- 插入标签数据
INSERT INTO tags (name, slug) VALUES
    ('PostgreSQL', 'postgresql'),
    ('Python', 'python'),
    ('JavaScript', 'javascript'),
    ('Tutorial', 'tutorial'),
    ('Best Practices', 'best-practices'),
    ('Performance', 'performance'),
    ('Security', 'security'),
    ('Cloud', 'cloud'),
    ('Docker', 'docker'),
    ('AI', 'ai'),
    ('React', 'react'),
    ('Node.js', 'nodejs'),
    ('SQL', 'sql'),
    ('NoSQL', 'nosql'),
    ('API', 'api');

-- 插入文章数据 (100篇文章)
INSERT INTO posts (title, slug, content, excerpt, author_id, category_id, status, view_count, like_count, published_at, created_at)
VALUES
    ('Introduction to PostgreSQL', 'intro-to-postgresql',
     'PostgreSQL is a powerful, open source object-relational database system...',
     'Learn the basics of PostgreSQL database', 2, 3, 'published', 1520, 89,
     NOW() - INTERVAL '30 days', NOW() - INTERVAL '31 days'),

    ('Advanced SQL Queries', 'advanced-sql-queries',
     'Master complex SQL queries with window functions and CTEs...',
     'Deep dive into advanced SQL techniques', 3, 3, 'published', 980, 67,
     NOW() - INTERVAL '25 days', NOW() - INTERVAL '26 days'),

    ('Web Development with React', 'web-dev-react',
     'Build modern web applications using React and hooks...',
     'Complete guide to React development', 2, 4, 'published', 2340, 156,
     NOW() - INTERVAL '20 days', NOW() - INTERVAL '21 days'),

    ('Python Best Practices', 'python-best-practices',
     'Write clean and maintainable Python code...',
     'Essential Python coding standards', 5, 2, 'published', 1780, 123,
     NOW() - INTERVAL '15 days', NOW() - INTERVAL '16 days'),

    ('Database Performance Tuning', 'db-performance-tuning',
     'Optimize your database queries for better performance...',
     'Performance optimization techniques', 3, 3, 'published', 890, 54,
     NOW() - INTERVAL '10 days', NOW() - INTERVAL '11 days');

-- 批量生成更多文章
INSERT INTO posts (title, slug, content, excerpt, author_id, category_id, status, view_count, like_count, published_at, created_at)
SELECT
    'Article ' || i || ': ' ||
    CASE WHEN i % 5 = 0 THEN 'Tutorial'
         WHEN i % 5 = 1 THEN 'Guide'
         WHEN i % 5 = 2 THEN 'Review'
         WHEN i % 5 = 3 THEN 'News'
         ELSE 'Discussion' END,
    'article-' || i,
    'This is the content of article ' || i || '. ' || repeat('Lorem ipsum dolor sit amet. ', 20),
    'This is the excerpt of article ' || i,
    2 + (i % 4),  -- Rotate through authors 2-5
    1 + (i % 10), -- Rotate through categories
    CASE WHEN i % 10 = 0 THEN 'draft'::post_status
         WHEN i % 10 = 9 THEN 'archived'::post_status
         ELSE 'published'::post_status END,
    (100 + (i * 37) % 3000),  -- Random view count
    (10 + (i * 17) % 200),    -- Random like count
    CASE WHEN i % 10 != 0 THEN NOW() - (i || ' days')::INTERVAL ELSE NULL END,
    NOW() - ((i + 1) || ' days')::INTERVAL
FROM generate_series(6, 100) AS i;

-- 插入文章标签关联
INSERT INTO post_tags (post_id, tag_id)
SELECT
    p.id,
    1 + ((p.id * 3 + s) % 15)  -- Distribute tags across posts
FROM posts p
CROSS JOIN generate_series(1, 3) AS s
WHERE p.id <= 50;

-- 插入评论数据 (300条评论)
INSERT INTO comments (post_id, user_id, content, is_approved, created_at)
SELECT
    1 + (i % 80),  -- Comment on first 80 posts
    6 + (i % 45),  -- Comments from users 6-50
    'This is comment ' || i || '. ' ||
    CASE WHEN i % 3 = 0 THEN 'Great article! Very helpful.'
         WHEN i % 3 = 1 THEN 'Thanks for sharing this information.'
         ELSE 'Interesting perspective.' END,
    CASE WHEN i % 20 = 0 THEN false ELSE true END,
    NOW() - ((i * 2) || ' hours')::INTERVAL
FROM generate_series(1, 300) AS i;

-- 插入一些回复评论
INSERT INTO comments (post_id, user_id, parent_id, content, created_at)
SELECT
    c.post_id,
    2 + (i % 4),  -- Replies from authors 2-5
    c.id,
    'Thanks for your comment! Glad you found it useful.',
    c.created_at + INTERVAL '2 hours'
FROM comments c
CROSS JOIN generate_series(1, 1) AS i
WHERE c.id <= 50 AND c.parent_id IS NULL;

-- 插入用户收藏数据
INSERT INTO favorites (user_id, post_id, created_at)
SELECT
    6 + (i % 45),  -- Users 6-50
    1 + ((i * 7) % 90),  -- Various posts
    NOW() - ((i * 3) || ' days')::INTERVAL
FROM generate_series(1, 200) AS i;

-- 插入阅读历史数据
INSERT INTO reading_history (user_id, post_id, read_at, read_duration_seconds)
SELECT
    6 + (i % 45),  -- Users 6-50
    1 + ((i * 5) % 90),  -- Various posts
    NOW() - ((i * 2) || ' hours')::INTERVAL,
    60 + (i * 13 % 600)  -- Reading duration 60-660 seconds
FROM generate_series(1, 500) AS i;

-- ============================================================================
-- 6. 更新统计信息
-- ============================================================================

ANALYZE users;
ANALYZE categories;
ANALYZE tags;
ANALYZE posts;
ANALYZE post_tags;
ANALYZE comments;
ANALYZE favorites;
ANALYZE reading_history;

-- ============================================================================
-- 7. 数据库统计摘要
-- ============================================================================

SELECT
    'blog_small' AS database_name,
    (SELECT COUNT(*) FROM users) AS users_count,
    (SELECT COUNT(*) FROM categories) AS categories_count,
    (SELECT COUNT(*) FROM tags) AS tags_count,
    (SELECT COUNT(*) FROM posts) AS posts_count,
    (SELECT COUNT(*) FROM comments) AS comments_count,
    (SELECT COUNT(*) FROM favorites) AS favorites_count,
    (SELECT COUNT(*) FROM reading_history) AS reading_history_count;

-- 完成
\echo '✅ Small blog database created successfully!'
\echo 'Database: blog_small'
\echo 'Tables: 8, Views: 2, Types: 2'
\echo 'Total records: ~1,150'
