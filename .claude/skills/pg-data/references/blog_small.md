# blog_small 数据库结构参考

博客系统数据库，包含用户、文章、评论、标签等核心功能。

## 表 (Tables)

### users - 用户表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| username | varchar(50) | NO | | 用户名 |
| email | varchar(100) | NO | | 邮箱地址 |
| password_hash | varchar(255) | NO | | 密码哈希 |
| role | user_role | NO | 'reader' | 用户角色 |
| full_name | varchar(100) | YES | | 全名 |
| avatar_url | varchar(255) | YES | | 头像URL |
| bio | text | YES | | 个人简介 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |
| last_login_at | timestamp | YES | | 最后登录时间 |

### posts - 文章表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| title | varchar(200) | NO | | 文章标题 |
| slug | varchar(200) | NO | | URL友好标识 |
| content | text | NO | | 文章内容 |
| excerpt | varchar(500) | YES | | 文章摘要 |
| author_id | bigint | NO | | 作者ID (FK: users.id) |
| category_id | bigint | YES | | 分类ID (FK: categories.id) |
| status | post_status | NO | 'draft' | 文章状态 |
| view_count | integer | NO | 0 | 浏览次数 |
| like_count | integer | NO | 0 | 点赞数 |
| published_at | timestamp | YES | | 发布时间 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### categories - 文章分类表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| name | varchar(50) | NO | | 分类名称 |
| slug | varchar(50) | NO | | URL友好标识符 |
| description | text | YES | | 分类描述 |
| parent_id | bigint | YES | | 父分类ID (支持多级分类) |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### tags - 文章标签表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| name | varchar(30) | NO | | 标签名称 |
| slug | varchar(30) | NO | | URL友好标识 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### post_tags - 文章标签关联表 (多对多关系)
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| post_id | bigint | NO | | 文章ID (FK: posts.id) |
| tag_id | bigint | NO | | 标签ID (FK: tags.id) |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### comments - 评论表
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| post_id | bigint | NO | | 文章ID (FK: posts.id) |
| user_id | bigint | NO | | 用户ID (FK: users.id) |
| parent_id | bigint | YES | | 父评论ID (支持评论回复) |
| content | text | NO | | 评论内容 |
| is_approved | boolean | NO | true | 是否已审核通过 |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |
| updated_at | timestamp | NO | CURRENT_TIMESTAMP | 更新时间 |

### favorites - 用户收藏的文章
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| user_id | bigint | NO | | 用户ID (FK: users.id) |
| post_id | bigint | NO | | 文章ID (FK: posts.id) |
| created_at | timestamp | NO | CURRENT_TIMESTAMP | 创建时间 |

### reading_history - 用户阅读历史记录
| 列名 | 数据类型 | 可空 | 默认值 | 描述 |
|------|----------|------|--------|------|
| id | bigint | NO | nextval | 主键 |
| user_id | bigint | NO | | 用户ID (FK: users.id) |
| post_id | bigint | NO | | 文章ID (FK: posts.id) |
| read_at | timestamp | NO | CURRENT_TIMESTAMP | 阅读时间 |
| read_duration_seconds | integer | YES | | 阅读时长(秒) |

## 视图 (Views)

### post_details - 文章详情视图
包含作者和分类信息的文章详情。

| 列名 | 描述 |
|------|------|
| id | 文章ID |
| title | 标题 |
| slug | URL标识 |
| content | 内容 |
| excerpt | 摘要 |
| status | 状态 |
| view_count | 浏览数 |
| like_count | 点赞数 |
| published_at | 发布时间 |
| created_at | 创建时间 |
| updated_at | 更新时间 |
| author_username | 作者用户名 |
| author_full_name | 作者全名 |
| author_avatar | 作者头像 |
| category_name | 分类名称 |
| category_slug | 分类标识 |

### user_stats - 用户统计信息视图
用户活动统计。

| 列名 | 描述 |
|------|------|
| id | 用户ID |
| username | 用户名 |
| full_name | 全名 |
| role | 角色 |
| post_count | 发文数 |
| comment_count | 评论数 |
| favorite_count | 收藏数 |
| last_post_date | 最后发文时间 |

## 自定义类型 (Types)

### user_role - 用户角色
- `admin` - 管理员
- `editor` - 编辑
- `author` - 作者
- `reader` - 读者

### post_status - 文章状态
- `draft` - 草稿
- `published` - 已发布
- `archived` - 已归档

## 关键索引 (Indexes)

- `idx_posts_author_id` - 文章作者索引
- `idx_posts_category_id` - 文章分类索引
- `idx_posts_status` - 文章状态索引
- `idx_posts_published_at` - 发布时间索引
- `idx_posts_view_count` - 浏览量索引
- `idx_posts_title_gin` - 标题全文搜索索引 (GIN)
- `idx_posts_content_gin` - 内容全文搜索索引 (GIN)
- `idx_comments_post_id` - 评论文章索引
- `idx_comments_user_id` - 评论用户索引
- `idx_users_email` - 用户邮箱索引
- `idx_users_role` - 用户角色索引

## 常用查询模式

1. **获取热门文章**: 按 view_count 或 like_count 降序
2. **获取用户的文章**: 通过 author_id 关联 users 表
3. **文章全文搜索**: 使用 GIN 索引对 title/content 进行搜索
4. **获取文章评论**: 通过 post_id 关联，支持嵌套评论(parent_id)
5. **获取用户收藏**: 通过 favorites 表关联用户和文章
