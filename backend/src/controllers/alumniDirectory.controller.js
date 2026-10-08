const semanticSearchService = require('../services/semanticSearch.service');

/**
 * GET /api/alumni/directory
 * Semantic search & filtering endpoint for students to browse and search alumni.
 * Supports: natural language semantic search (q), currentCompany, previousCompany,
 *           jobRole, branch, graduationYear, domain, skills, location, mentorshipAvailable.
 * Returns semantic similarity-ranked results, match reasons, and real-time connection status.
 */
const getAlumniDirectory = async (req, res, next) => {
  try {
    const {
      q = '',
      currentCompany = '',
      previousCompany = '',
      jobRole = '',
      branch = '',
      graduationYear = '',
      domain = '',
      skills = '',
      location = '',
      mentorshipAvailable = '',
      page = '1',
      limit = '20',
    } = req.query;

    const currentUserId = req.user?.userId;

    const result = await semanticSearchService.searchAlumniSemantic({
      query: q,
      currentCompany,
      previousCompany,
      jobRole,
      branch,
      graduationYear,
      domain,
      skills,
      location,
      mentorshipAvailable,
      currentUserId,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/alumni/sync-embeddings
 * Trigger embedding generation for alumni profiles in PostgreSQL
 */
const syncEmbeddings = async (req, res, next) => {
  try {
    const result = await semanticSearchService.syncAlumniEmbeddings();
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlumniDirectory,
  syncEmbeddings,
};
