-- Cloudflare D1 Database Schema for Recipe Website

-- Categories table
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    parent_id INTEGER,
    sort_order INTEGER DEFAULT 0,
    recipe_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    meta_title TEXT,
    meta_description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Recipes table
CREATE TABLE recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    ingredients TEXT NOT NULL, -- JSON string
    instructions TEXT NOT NULL, -- JSON string
    prep_time INTEGER, -- minutes
    cook_time INTEGER, -- minutes
    total_time INTEGER, -- minutes
    servings INTEGER,
    difficulty TEXT CHECK(difficulty IN ('easy', 'medium', 'hard')),
    image_url TEXT,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    calories INTEGER,
    protein REAL,
    carbs REAL,
    fat REAL,
    fiber REAL,
    sugar REAL,
    featured BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'published' CHECK(status IN ('draft', 'published', 'archived')),
    meta_title TEXT,
    meta_description TEXT,
    tags TEXT, -- JSON array as string
    author_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recipe categories junction table (many-to-many)
CREATE TABLE recipe_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(recipe_id, category_id)
);

-- Reviews table
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    reviewer_name TEXT NOT NULL,
    reviewer_email TEXT,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    helpful_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published' CHECK(status IN ('pending', 'published', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Authors table
CREATE TABLE authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    social_links TEXT, -- JSON string
    recipe_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User favorites table (for future user system)
CREATE TABLE user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL, -- For anonymous users, use session ID
    recipe_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    UNIQUE(user_id, recipe_id)
);

-- Search index table for better search performance
CREATE TABLE recipe_search_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    search_text TEXT NOT NULL, -- Combined searchable text
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_recipes_featured ON recipes(featured);
CREATE INDEX idx_recipes_rating ON recipes(rating);
CREATE INDEX idx_recipes_created_at ON recipes(created_at);
CREATE INDEX idx_recipe_categories_recipe_id ON recipe_categories(recipe_id);
CREATE INDEX idx_recipe_categories_category_id ON recipe_categories(category_id);
CREATE INDEX idx_reviews_recipe_id ON reviews(recipe_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_categories_featured ON categories(featured);
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_recipe_search_text ON recipe_search_index(search_text);

-- Insert sample categories
INSERT INTO categories (slug, name, description, image_url, featured, sort_order) VALUES
('breakfast', 'Breakfast & Brunch', 'Start your day right with delicious morning meals', '/images/categories/breakfast.jpg', TRUE, 1),
('lunch', 'Lunch', 'Quick and satisfying midday meals', '/images/categories/lunch.jpg', TRUE, 2),
('dinner', 'Dinner', 'Hearty evening meals for the whole family', '/images/categories/dinner.jpg', TRUE, 3),
('appetizers', 'Appetizers & Snacks', 'Perfect starters and bite-sized treats', '/images/categories/appetizers.jpg', TRUE, 4),
('desserts', 'Desserts', 'Sweet treats and indulgent desserts', '/images/categories/desserts.jpg', TRUE, 5),
('beverages', 'Beverages', 'Refreshing drinks and cocktails', '/images/categories/beverages.jpg', TRUE, 6),
('high-protein', 'High-Protein Meals', 'Protein-rich recipes for fitness enthusiasts', '/images/categories/high-protein.jpg', TRUE, 7),
('quick-easy', 'Quick & Easy Meals', 'Fast recipes for busy weeknights', '/images/categories/quick-meals.jpg', TRUE, 8),
('healthy', 'Healthy Recipes', 'Nutritious and wholesome meal options', '/images/categories/healthy.jpg', TRUE, 9),
('vegetarian', 'Vegetarian', 'Delicious meat-free recipes', '/images/categories/vegetarian.jpg', FALSE, 10),
('vegan', 'Vegan', 'Plant-based recipes for everyone', '/images/categories/vegan.jpg', FALSE, 11),
('gluten-free', 'Gluten-Free', 'Safe options for gluten sensitivity', '/images/categories/gluten-free.jpg', FALSE, 12),
('keto', 'Keto', 'Low-carb, high-fat recipes', '/images/categories/keto.jpg', FALSE, 13),
('paleo', 'Paleo', 'Whole foods, ancestral eating', '/images/categories/paleo.jpg', FALSE, 14),
('italian', 'Italian', 'Classic pasta, pizza, and Italian favorites', '/images/categories/italian.jpg', FALSE, 15),
('mexican', 'Mexican', 'Spicy and flavorful Mexican cuisine', '/images/categories/mexican.jpg', FALSE, 16),
('asian', 'Asian', 'Chinese, Japanese, Thai, and more', '/images/categories/asian.jpg', FALSE, 17),
('american', 'American', 'Classic American comfort food', '/images/categories/american.jpg', FALSE, 18),
('mediterranean', 'Mediterranean', 'Fresh and healthy Mediterranean dishes', '/images/categories/mediterranean.jpg', FALSE, 19),
('no-bake', 'No-Bake', 'No oven required recipes', '/images/categories/no-bake.jpg', FALSE, 20),
('slow-cooker', 'Slow Cooker', 'Set it and forget it meals', '/images/categories/slow-cooker.jpg', FALSE, 21),
('instant-pot', 'Instant Pot', 'Pressure cooker perfection', '/images/categories/instant-pot.jpg', FALSE, 22);

-- Insert sample authors
INSERT INTO authors (name, email, bio, avatar_url, social_links) VALUES
('Sarah Johnson', 'sarah@recipewebsite.com', 'A former restaurant chef turned home cooking advocate, Sarah believes that great food should be accessible to everyone.', '/images/authors/sarah.jpg', '{"instagram": "@sarahcooks", "twitter": "@sarahrecipes"}'),
('Mike Chen', 'mike@recipewebsite.com', 'Mike specializes in fusion cuisine and quick weeknight meals. As a working parent of two, he understands the challenge of getting dinner on the table.', '/images/authors/mike.jpg', '{"instagram": "@mikechenrecp", "linkedin": "mikechen"}'),
('Emma Rodriguez', 'emma@recipewebsite.com', 'Emma ensures all our recipes are not just delicious but also nutritionally balanced. She holds a degree in Nutrition Science.', '/images/authors/emma.jpg', '{"instagram": "@emmahealthy", "blog": "emmanutrition.com"}');

-- Insert sample recipes
INSERT INTO recipes (
    slug, title, description, ingredients, instructions, prep_time, cook_time, total_time, 
    servings, difficulty, image_url, rating, review_count, calories, protein, carbs, fat, 
    fiber, sugar, featured, tags, author_id, meta_title, meta_description
) VALUES
(
    'better-than-sex-fruit',
    'Better Than Sex Fruit',
    'A creamy blend of tropical fruits and sweetened condensed milk creating a luscious, chilled fruit mix that''s absolutely irresistible!',
    '[
        {"item": "Pineapple chunks", "amount": "2", "unit": "cups", "notes": "fresh or canned, drained"},
        {"item": "Mandarin oranges", "amount": "1", "unit": "can", "notes": "drained"},
        {"item": "Maraschino cherries", "amount": "1", "unit": "cup", "notes": "drained and halved"},
        {"item": "Sweetened condensed milk", "amount": "1", "unit": "can", "notes": "14 oz"},
        {"item": "Cool Whip", "amount": "1", "unit": "container", "notes": "8 oz, thawed"},
        {"item": "Mini marshmallows", "amount": "2", "unit": "cups"},
        {"item": "Coconut flakes", "amount": "1", "unit": "cup", "notes": "sweetened"}
    ]',
    '[
        {"step": 1, "instruction": "In a large mixing bowl, combine the drained pineapple chunks, mandarin oranges, and halved maraschino cherries."},
        {"step": 2, "instruction": "Add the mini marshmallows and coconut flakes to the fruit mixture."},
        {"step": 3, "instruction": "Pour the sweetened condensed milk over the fruit mixture and gently fold together."},
        {"step": 4, "instruction": "Fold in the thawed Cool Whip until everything is well combined and creamy."},
        {"step": 5, "instruction": "Cover and refrigerate for at least 2 hours before serving to allow flavors to meld."},
        {"step": 6, "instruction": "Serve chilled and enjoy this heavenly fruit salad!"}
    ]',
    15, 0, 15, 8, 'easy', '/images/recipes/fruit-salad.jpg', 4.8, 342, 285, 4, 52, 8, 2, 48, TRUE,
    '["no-bake", "fruity", "creamy", "summer", "tropical"]', 1,
    'Better Than Sex Fruit Recipe - Easy No-Bake Dessert',
    'A creamy blend of tropical fruits and sweetened condensed milk creating a luscious, chilled fruit mix. Easy no-bake dessert perfect for any occasion.'
),
(
    'lemon-cream-cheese-cake',
    'Lemon Cream Cheese Cake',
    'Layered lemon filling with cream cheese and buttery yellow cake for a delightful treat that''s perfect for any celebration.',
    '[
        {"item": "Yellow cake mix", "amount": "1", "unit": "box"},
        {"item": "Cream cheese", "amount": "8", "unit": "oz", "notes": "softened"},
        {"item": "Butter", "amount": "1/2", "unit": "cup", "notes": "melted"},
        {"item": "Powdered sugar", "amount": "1", "unit": "lb"},
        {"item": "Lemon juice", "amount": "1/4", "unit": "cup", "notes": "fresh"},
        {"item": "Lemon zest", "amount": "2", "unit": "tbsp"},
        {"item": "Heavy cream", "amount": "1", "unit": "cup"},
        {"item": "Vanilla extract", "amount": "1", "unit": "tsp"}
    ]',
    '[
        {"step": 1, "instruction": "Preheat oven to 350°F. Prepare cake mix according to package directions and bake in two 9-inch round pans."},
        {"step": 2, "instruction": "Let cakes cool completely on wire racks."},
        {"step": 3, "instruction": "Beat cream cheese until smooth. Gradually add powdered sugar, lemon juice, and zest."},
        {"step": 4, "instruction": "In a separate bowl, whip heavy cream with vanilla until stiff peaks form."},
        {"step": 5, "instruction": "Fold whipped cream into cream cheese mixture until combined."},
        {"step": 6, "instruction": "Place one cake layer on serving plate. Spread half the filling on top."},
        {"step": 7, "instruction": "Add second layer and spread remaining filling. Refrigerate for at least 2 hours before serving."}
    ]',
    30, 25, 55, 12, 'medium', '/images/recipes/lemon-cake.jpg', 4.6, 189, 425, 6, 65, 16, 1, 58, TRUE,
    '["citrus", "creamy", "layered", "special-occasion", "cake"]', 1,
    'Lemon Cream Cheese Cake Recipe - Perfect for Celebrations',
    'Layered lemon filling with cream cheese and buttery yellow cake for a delightful treat. Perfect celebration cake with bright citrus flavors.'
);

-- Link recipes to categories
INSERT INTO recipe_categories (recipe_id, category_id) VALUES
(1, 5), -- Better Than Sex Fruit -> Desserts
(1, 20), -- Better Than Sex Fruit -> No-Bake
(2, 5), -- Lemon Cream Cheese Cake -> Desserts
(2, 1); -- Lemon Cream Cheese Cake -> Breakfast (can work for brunch)

-- Update recipe counts for categories
UPDATE categories SET recipe_count = (
    SELECT COUNT(*) FROM recipe_categories WHERE category_id = categories.id
);

-- Insert sample reviews
INSERT INTO reviews (recipe_id, reviewer_name, reviewer_email, rating, title, comment, helpful_count) VALUES
(1, 'Sarah M.', 'sarah.m@email.com', 5, 'Absolutely Delicious!', 'This recipe is amazing! I made it for a family gathering and everyone loved it. So easy to make and the flavors are incredible. Will definitely make again!', 12),
(1, 'Mike R.', 'mike.r@email.com', 4, 'Great summer dessert', 'Perfect for hot summer days! I added some fresh strawberries and it was even better. My kids couldn''t get enough.', 8),
(2, 'Jennifer L.', 'jen.l@email.com', 5, 'Perfect for birthdays!', 'Made this for my daughter''s birthday and it was a hit! The lemon flavor is just right - not too tart, not too sweet.', 15),
(2, 'Tom K.', 'tom.k@email.com', 4, 'Easy and impressive', 'Looks much harder to make than it actually is. Great recipe for impressing guests without too much work.', 6);

-- Update recipe ratings and review counts
UPDATE recipes SET 
    rating = (SELECT AVG(CAST(rating AS REAL)) FROM reviews WHERE recipe_id = recipes.id),
    review_count = (SELECT COUNT(*) FROM reviews WHERE recipe_id = recipes.id)
WHERE id IN (SELECT DISTINCT recipe_id FROM reviews);

-- Create search index entries
INSERT INTO recipe_search_index (recipe_id, search_text)
SELECT 
    id,
    LOWER(title || ' ' || description || ' ' || tags || ' ' || ingredients || ' ' || instructions)
FROM recipes;

-- Triggers to maintain data consistency

-- Update recipe count when recipe_categories changes
CREATE TRIGGER update_category_recipe_count_insert
AFTER INSERT ON recipe_categories
BEGIN
    UPDATE categories 
    SET recipe_count = (SELECT COUNT(*) FROM recipe_categories WHERE category_id = NEW.category_id)
    WHERE id = NEW.category_id;
END;

CREATE TRIGGER update_category_recipe_count_delete
AFTER DELETE ON recipe_categories
BEGIN
    UPDATE categories 
    SET recipe_count = (SELECT COUNT(*) FROM recipe_categories WHERE category_id = OLD.category_id)
    WHERE id = OLD.category_id;
END;

-- Update recipe rating when reviews change
CREATE TRIGGER update_recipe_rating_insert
AFTER INSERT ON reviews
BEGIN
    UPDATE recipes SET 
        rating = (SELECT AVG(CAST(rating AS REAL)) FROM reviews WHERE recipe_id = NEW.recipe_id),
        review_count = (SELECT COUNT(*) FROM reviews WHERE recipe_id = NEW.recipe_id)
    WHERE id = NEW.recipe_id;
END;

CREATE TRIGGER update_recipe_rating_delete
AFTER DELETE ON reviews
BEGIN
    UPDATE recipes SET 
        rating = COALESCE((SELECT AVG(CAST(rating AS REAL)) FROM reviews WHERE recipe_id = OLD.recipe_id), 0),
        review_count = (SELECT COUNT(*) FROM reviews WHERE recipe_id = OLD.recipe_id)
    WHERE id = OLD.recipe_id;
END;

-- Update search index when recipe changes
CREATE TRIGGER update_search_index
AFTER UPDATE ON recipes
BEGIN
    DELETE FROM recipe_search_index WHERE recipe_id = NEW.id;
    INSERT INTO recipe_search_index (recipe_id, search_text)
    VALUES (NEW.id, LOWER(NEW.title || ' ' || NEW.description || ' ' || NEW.tags || ' ' || NEW.ingredients || ' ' || NEW.instructions));
END;

-- Update timestamps
CREATE TRIGGER update_recipe_timestamp
AFTER UPDATE ON recipes
BEGIN
    UPDATE recipes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_category_timestamp
AFTER UPDATE ON categories
BEGIN
    UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;