// Cloudflare Worker API for Recipe Website with D1 Database

export default {
    async fetch(request, env, ctx) {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;
  
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };
  
      // Handle preflight requests
      if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
  
      try {
        // Route handlers
        if (path.startsWith('/api/')) {
          const apiPath = path.replace('/api', '');
          
          switch (true) {
            case apiPath === '/categories' && method === 'GET':
              return await getCategories(env.DB, url.searchParams, corsHeaders);
            
            case apiPath === '/recipes' && method === 'GET':
              return await getRecipes(env.DB, url.searchParams, corsHeaders);
            
            case apiPath.match(/^\/recipes\/[\w-]+$/) && method === 'GET':
              const recipeSlug = apiPath.split('/')[2];
              return await getRecipe(env.DB, recipeSlug, corsHeaders);
            
            case apiPath.match(/^\/categories\/[\w-]+$/) && method === 'GET':
              const categorySlug = apiPath.split('/')[2];
              return await getCategory(env.DB, categorySlug, corsHeaders);
            
            case apiPath.match(/^\/categories\/[\w-]+\/recipes$/) && method === 'GET':
              const catSlug = apiPath.split('/')[2];
              return await getCategoryRecipes(env.DB, catSlug, url.searchParams, corsHeaders);
            
            case apiPath === '/search' && method === 'GET':
              return await searchRecipes(env.DB, url.searchParams, corsHeaders);
            
            case apiPath.match(/^\/recipes\/[\w-]+\/reviews$/) && method === 'GET':
              const reviewRecipeSlug = apiPath.split('/')[2];
              return await getRecipeReviews(env.DB, reviewRecipeSlug, url.searchParams, corsHeaders);
            
            case apiPath.match(/^\/recipes\/[\w-]+\/reviews$/) && method === 'POST':
              const postReviewSlug = apiPath.split('/')[2];
              return await addReview(env.DB, postReviewSlug, request, corsHeaders);
            
            case apiPath === '/authors' && method === 'GET':
              return await getAuthors(env.DB, corsHeaders);
            
            case apiPath.match(/^\/authors\/\d+$/) && method === 'GET':
              const authorId = apiPath.split('/')[2];
              return await getAuthor(env.DB, authorId, corsHeaders);
            
            default:
              return jsonResponse({ error: 'Endpoint not found' }, 404, corsHeaders);
          }
        }
  
        return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
      } catch (error) {
        console.error('API Error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
      }
    }
  };
  
  // Helper function to create JSON responses
  function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });
  }
  
  // Get all categories
  async function getCategories(db, searchParams, corsHeaders) {
    try {
      const featured = searchParams.get('featured');
      const parentId = searchParams.get('parent_id');
      const limit = parseInt(searchParams.get('limit')) || 50;
      const offset = parseInt(searchParams.get('offset')) || 0;
  
      let query = `
        SELECT id, slug, name, description, image_url, parent_id, 
               recipe_count, featured, sort_order, created_at, updated_at
        FROM categories 
        WHERE 1=1
      `;
      const params = [];
  
      if (featured === 'true') {
        query += ` AND featured = ?`;
        params.push(true);
      }
  
      if (parentId) {
        query += ` AND parent_id = ?`;
        params.push(parentId);
      } else if (parentId === null || parentId === 'null') {
        query += ` AND parent_id IS NULL`;
      }
  
      query += ` ORDER BY sort_order ASC, name ASC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
  
      const result = await db.prepare(query).bind(...params).all();
  
      return jsonResponse({
        success: true,
        data: result.results,
        total: result.results.length,
        pagination: {
          limit,
          offset,
          hasMore: result.results.length === limit
        }
      }, 200, corsHeaders);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return jsonResponse({ error: 'Failed to fetch categories' }, 500, corsHeaders);
    }
  }
  
  // Get all recipes with filtering
  async function getRecipes(db, searchParams, corsHeaders) {
    try {
      const category = searchParams.get('category');
      const featured = searchParams.get('featured');
      const difficulty = searchParams.get('difficulty');
      const maxTime = searchParams.get('max_time');
      const minRating = searchParams.get('min_rating');
      const sortBy = searchParams.get('sort_by') || 'created_at';
      const sortOrder = searchParams.get('sort_order') || 'DESC';
      const limit = parseInt(searchParams.get('limit')) || 20;
      const offset = parseInt(searchParams.get('offset')) || 0;
  
      let query = `
        SELECT DISTINCT r.id, r.slug, r.title, r.description, r.prep_time, 
               r.cook_time, r.total_time, r.servings, r.difficulty, r.image_url,
               r.rating, r.review_count, r.calories, r.featured, r.tags,
               r.created_at, r.updated_at,
               a.name as author_name, a.avatar_url as author_avatar
        FROM recipes r
        LEFT JOIN authors a ON r.author_id = a.id
        LEFT JOIN recipe_categories rc ON r.id = rc.recipe_id
        LEFT JOIN categories c ON rc.category_id = c.id
        WHERE r.status = 'published'
      `;
      const params = [];
  
      if (category) {
        query += ` AND c.slug = ?`;
        params.push(category);
      }
  
      if (featured === 'true') {
        query += ` AND r.featured = ?`;
        params.push(true);
      }
  
      if (difficulty) {
        query += ` AND r.difficulty = ?`;
        params.push(difficulty);
      }
  
      if (maxTime) {
        query += ` AND r.total_time <= ?`;
        params.push(parseInt(maxTime));
      }
  
      if (minRating) {
        query += ` AND r.rating >= ?`;
        params.push(parseFloat(minRating));
      }
  
      // Validate sort column to prevent SQL injection
      const validSortColumns = ['created_at', 'updated_at', 'title', 'rating', 'total_time', 'prep_time'];
      const validSortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
  
      query += ` ORDER BY r.${validSortColumn} ${validSortOrder} LIMIT ? OFFSET ?`;
      params.push(limit, offset);
  
      const result = await db.prepare(query).bind(...params).all();
  
      // Parse JSON fields
      const recipes = result.results.map(recipe => ({
        ...recipe,
        tags: recipe.tags ? JSON.parse(recipe.tags) : [],
        featured: !!recipe.featured
      }));
  
      return jsonResponse({
        success: true,
        data: recipes,
        total: recipes.length,
        pagination: {
          limit,
          offset,
          hasMore: recipes.length === limit
        }
      }, 200, corsHeaders);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      return jsonResponse({ error: 'Failed to fetch recipes' }, 500, corsHeaders);
    }
  }
  
  // Get single recipe by slug
  async function getRecipe(db, slug, corsHeaders) {
    try {
      const recipeQuery = `
        SELECT r.*, a.name as author_name, a.bio as author_bio, 
               a.avatar_url as author_avatar, a.social_links as author_social
        FROM recipes r
        LEFT JOIN authors a ON r.author_id = a.id
        WHERE r.slug = ? AND r.status = 'published'
      `;
  
      const recipeResult = await db.prepare(recipeQuery).bind(slug).first();
  
      if (!recipeResult) {
        return jsonResponse({ error: 'Recipe not found' }, 404, corsHeaders);
      }
  
      // Get recipe categories
      const categoriesQuery = `
        SELECT c.id, c.slug, c.name
        FROM categories c
        JOIN recipe_categories rc ON c.id = rc.category_id
        WHERE rc.recipe_id = ?
      `;
      const categoriesResult = await db.prepare(categoriesQuery).bind(recipeResult.id).all();
  
      // Parse JSON fields
      const recipe = {
        ...recipeResult,
        ingredients: JSON.parse(recipeResult.ingredients),
        instructions: JSON.parse(recipeResult.instructions),
        tags: recipeResult.tags ? JSON.parse(recipeResult.tags) : [],
        author_social: recipeResult.author_social ? JSON.parse(recipeResult.author_social) : {},
        categories: categoriesResult.results,
        featured: !!recipeResult.featured
      };
  
      return jsonResponse({
        success: true,
        data: recipe
      }, 200, corsHeaders);
    } catch (error) {
      console.error('Error fetching recipe:', error);
      return jsonResponse({ error: 'Failed to fetch recipe' }, 500, corsHeaders);
    }
  }
  
  // Get single category by slug
  async function getCategory(db, slug, corsHeaders) {
    try {
      const query = `
        SELECT * FROM categories WHERE slug = ?
      `;
  
      const result = await db.prepare(query).bind(slug).first();
  
      if (!result) {
        return jsonResponse({ error: 'Category not found' }, 404, corsHeaders);
      }
  
      return jsonResponse({
        success: true,
        data: {
          ...result,
          featured: !!result.featured
        }
      }, 200, corsHeaders);
    } catch (error) {
      console.error('Error fetching category:', error);
      return jsonResponse({ error: 'Failed to fetch category' }, 500, corsHeaders);
    }
  }
  
  // Get recipes in a specific category
  async function getCategoryRecipes(db, categorySlug, searchParams, corsHeaders) {
    try {
      const limit = parseInt(searchParams.get('limit')) || 20;
      const offset = parseInt(searchParams.get('offset')) || 0;
      const sortBy = searchParams.get('sort_by') || 'created_at';
      const sortOrder = searchParams.get('sort_order') || 'DESC';
  
      const query = `
        SELECT DISTINCT r.id, r.slug, r.title, r.description, r.prep_time,
               r.cook_time, r.total_time, r.servings, r.difficulty, r.image_url,
               r.rating, r.review_count, r.calories, r.featured, r.tags,
               r.created_at, r.updated_at,
               a.name as author_name, a.avatar_url as author_avatar
        FROM recipes r
        JOIN recipe_categories rc ON r.id = rc.recipe_id
        JOIN categories c ON rc.category_id = c.id
        LEFT JOIN authors a ON r.author_id = a.id
        WHERE c.slug = ? AND r.status = 'published'
        ORDER BY r.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
  
      const validSortColumns = ['created_at', 'updated_at', 'title', 'rating', 'total_time'];
      const validSortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
  
      const result = await db.prepare(query).bind(categorySlug, limit, offset).all();
  
      const recipes = result.results.map(recipe => ({
        ...recipe,
        tags: recipe.tags ? JSON.parse(recipe.tags) : [],
        featured: !!recipe.featured
      }));
  
      return jsonResponse({
        success: true,
        data: recipes,
        total: recipes.length,
        pagination: {
          limit,
          offset,
          hasMore: recipes.length === limit
        }
      }, 200, corsHeaders);
    } catch (error) {
      console.error('Error fetching category recipes:', error);
      return jsonResponse({ error: 'Failed to fetch category recipes' }, 500, corsHeaders);
    }
  }
  
  // Search recipes
  async function searchRecipes(db, searchParams, corsHeaders) {
    try {
      const query = searchParams.get('q') || '';
      const category = searchParams.get('category');
      const difficulty = searchParams.get('difficulty');
      const maxTime = searchParams.get('max_time');
      const limit = parseInt(searchParams.get('limit')) || 20;
      const offset = parseInt(searchParams.get('offset')) || 0;
  
      if (!query.trim()) {
        return jsonResponse({ error: 'Search query is required' }, 400, corsHeaders);
      }
  
      let sqlQuery = `
        SELECT DISTINCT r.id, r.slug, r.title, r.description, r.prep_time,
               r.cook_time, r.total_time, r.servings, r.difficulty, r.image_url,
               r.rating, r.review_count, r.calories, r.featured, r.tags,
               r.created_at, r.updated_at,
               a.name as author_name, a.avatar_url as author_avatar
        FROM recipes r
        JOIN recipe_search_index rsi ON r.id = rsi.recipe_id
        LEFT JOIN authors a ON r.author_id = a.id
        LEFT JOIN recipe_categories rc ON r.id = rc.recipe_id
        LEFT JOIN categories c ON rc.category_id = c.id
        WHERE r.status = 'published' AND rsi.search_text LIKE ?
      `;
      const params = [`%${query.toLowerCase()}%`];
  
      if (category) {
        sqlQuery += ` AND c.slug = ?`;
        params.push(category);
      }
  
      if (difficulty) {
        sqlQuery += ` AND r.difficulty = ?`;
        params.push(difficulty);
      }
  
      if (maxTime) {
        sqlQuery += ` AND r.total_time <= ?`;
        params.push(parseInt(maxTime));
      }
  
      sqlQuery += ` ORDER BY r.rating DESC, r.created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
  
      const result = await db.prepare(sqlQuery).bind(...params).all();
  
      const recipes = result.results.map(recipe => ({
        ...recipe,
        tags: recipe.tags ? JSON.parse(recipe.tags) : [],
        featured: !!recipe.featured
      }));
  
      return jsonResponse({
        success: true,
        data: recipes,
        query,
        total: recipes.length,
        pagination: {
          limit,
          offset,
          hasMore: recipes.length === limit
        }
      }, 200, corsHeaders);
    } catch (error) {
      console.error('Error searching recipes:', error);
      return jsonResponse({ error: 'Failed to search recipes' }, 500, corsHeaders);
    }
  }
  
  // Get recipe reviews
  async function getRecipeReviews(db, recipeSlug, searchParams, corsHeaders) {
    try {
      const limit = parseInt(searchParams.get('limit')) || 10;
      const offset = parseInt(searchParams.get('offset')) || 0;
      const sortBy = searchParams.get('sort_by') || 'created_at';
      const sortOrder = searchParams.get('sort_order') || 'DESC';
  
      // First get the recipe ID
      const recipeResult = await db.prepare('SELECT id FROM recipes WHERE slug = ?').bind(recipeSlug).first();
      
      if (!recipeResult) {
        return jsonResponse({ error: 'Recipe not found' }, 404, corsHeaders);
      }
  
      const query = `
        SELECT id, reviewer_name, rating, title, comment, helpful_count, created_at
        FROM reviews
        WHERE recipe_id = ? AND status = 'published'
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
  
      const validSortColumns = ['created_at', 'rating', 'helpful_count'];
      const validSortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';
  
      const result = await db.prepare(query).bind(recipeResult.id, limit, offset).all();
  
      // Get review statistics
      const statsQuery = `
        SELECT 
          COUNT(*) as total_reviews,
          AVG(CAST(rating AS REAL)) as average_rating,
          COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
          COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
          COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
          COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
          COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
        FROM reviews
        WHERE recipe_id = ? AND status = 'published'
      `;
  
      const statsResult = await db.prepare(statsQuery).bind(recipeResult.id).first();
  
      return jsonResponse({
        success: true,
        data: result.results,
        statistics: {
          total_reviews: statsResult.total_reviews,
          average_rating: Math.round(statsResult.average_rating * 10) / 10,
          rating_breakdown: {
            5: statsResult.five_star,
            4: statsResult.four_star,
            3: statsResult.three_star,
            2: statsResult.two_star,
            1: statsResult.one_star
          }
        },
        pagination: {
          limit,
          offset,
          hasMore: result.results.length === limit
        }
      }, 200, corsHeaders);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return jsonResponse({ error: 'Failed to fetch reviews' }, 500, corsHeaders);
    }
  }
  
  // Add a new review
  async function addReview(db, recipeSlug, request, corsHeaders) {
    try {
      const body = await request.json();
      const { reviewer_name, reviewer_email, rating, title, comment } = body;
  
      // Validation
      if (!reviewer_name || !rating || rating < 1 || rating > 5) {
        return jsonResponse({ error: 'Invalid review data' }, 400, corsHeaders);
      }
  
      // Get recipe ID
      const recipeResult = await db.prepare('SELECT id FROM recipes WHERE slug = ?').bind(recipeSlug).first();
      
      if (!recipeResult) {
        return jsonResponse({ error: 'Recipe not found' }, 404, corsHeaders);
      }
  
      // Insert review
      const insertQuery = `
        INSERT INTO reviews (recipe_id, reviewer_name, reviewer_email, rating, title, comment)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
  
      const result = await db.prepare(insertQuery).bind(
        recipeResult.id,
        reviewer_name,
        reviewer_email || null,
        rating,
        title || null,
        comment || null
      ).run();
  
      if (result.success) {
        return jsonResponse({
          success: true,
          message: 'Review added successfully',
          id: result.meta.last_row_id
        }, 201, corsHeaders);
      } else {
        throw new Error('Failed to insert review');
      }
    } catch (error) {
      console.error('Error adding review:', error);
      return jsonResponse({ error: 'Failed to add review' }, 500, corsHeaders);
    }
  }
  
  // Get all authors
  async function getAuthors(db, corsHeaders) {
    try {
      const query = `
        SELECT id, name, bio, avatar_url, social_links, recipe_count, created_at
        FROM authors
        ORDER BY recipe_count DESC, name ASC
      `;
  
      const result = await db.prepare(query).all();
  
      const authors = result.results.map(author => ({
        ...author,
        social_links: author.social_links ? JSON.parse(author.social_links) : {}
      }));
  
      return jsonResponse({
        success: true,
        data: authors
      }, 200, corsHeaders);
    } catch (error) {
      console.error('Error fetching authors:', error);
      return jsonResponse({ error: 'Failed to fetch authors' }, 500, corsHeaders);
    }
  }
  
  // Get single author
  async function getAuthor(db, authorId, corsHeaders) {
    try {
      const authorQuery = `
        SELECT id, name, bio, avatar_url, social_links, recipe_count, created_at
        FROM authors
        WHERE id = ?
      `;
  
      const authorResult = await db.prepare(authorQuery).bind(authorId).first();
  
      if (!authorResult) {
        return jsonResponse({ error: 'Author not found' }, 404, corsHeaders);
      }
  
      // Get author's recipes
      const recipesQuery = `
        SELECT id, slug, title, description, image_url, rating, review_count, 
               prep_time, cook_time, difficulty, featured, created_at
        FROM recipes
        WHERE author_id = ? AND status = 'published'
        ORDER BY created_at DESC
        LIMIT 20
      `;
  
      const recipesResult = await db.prepare(recipesQuery).bind(authorId).all();
  
      const author = {
        ...authorResult,
        social_links: authorResult.social_links ? JSON.parse(authorResult.social_links) : {},
        recipes: recipesResult.results.map(recipe => ({
          ...recipe,
          featured: !!recipe.featured
        }))
      };
  
      return jsonResponse({
        success: true,
        data: author
      }, 200, corsHeaders);
    } catch (error) {
      console.error('Error fetching author:', error);
      return jsonResponse({ error: 'Failed to fetch author' }, 500, corsHeaders);
    }
  }