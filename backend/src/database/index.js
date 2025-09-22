const db = require('./database');
const {
  PaperOperations,
  CategoryOperations,
  PaperCategoryOperations,
  DescriptionOperations
} = require('./operations');

async function initializeConnection() {
  await db.connect();
}

async function getAllPapers() {
  return await PaperOperations.getAllPapers();
}

async function getPaper(id) {
  return await PaperOperations.getPaper(id);
}

async function createPaper(paperData) {
  return await PaperOperations.createPaper(paperData);
}

async function updatePaper(id, paperData) {
  return await PaperOperations.updatePaper(id, paperData);
}

async function deletePaper(id) {
  return await PaperOperations.deletePaper(id);
}

async function updatePaperStatus(id, status) {
  return await PaperOperations.updatePaperStatus(id, status);
}

async function updatePaperFavorite(id, isFavorite) {
  return await PaperOperations.updatePaperFavorite(id, isFavorite);
}

async function getPaperStats() {
  return await PaperOperations.getPaperStats();
}

async function searchPapers(query) {
  return await PaperOperations.searchPapers(query);
}

async function getAllCategories() {
  return await CategoryOperations.getAllCategories();
}

async function getCategory(id) {
  return await CategoryOperations.getCategory(id);
}

async function createCategory(name) {
  return await CategoryOperations.createCategory(name);
}

async function deleteCategory(id) {
  return await CategoryOperations.deleteCategory(id);
}

async function getPapersByCategory(categoryId) {
  return await CategoryOperations.getPapersByCategory(categoryId);
}

async function addPaperToCategory(paperId, categoryId) {
  return await PaperCategoryOperations.addPaperToCategory(paperId, categoryId);
}

async function removePaperFromCategory(paperId, categoryId) {
  return await PaperCategoryOperations.removePaperFromCategory(paperId, categoryId);
}

async function createDescription(descriptionData) {
  return await DescriptionOperations.createDescription(descriptionData);
}

async function getDescription(id) {
  return await DescriptionOperations.getDescription(id);
}

async function getDescriptionByPaper(paperId) {
  return await DescriptionOperations.getDescriptionByPaper(paperId);
}

async function updateDescription(id, descriptionData) {
  return await DescriptionOperations.updateDescription(id, descriptionData);
}

async function deleteDescription(id) {
  return await DescriptionOperations.deleteDescription(id);
}

initializeConnection().catch(console.error);

module.exports = {
  db,
  getAllPapers,
  getPaper,
  createPaper,
  updatePaper,
  deletePaper,
  updatePaperStatus,
  updatePaperFavorite,
  getPaperStats,
  searchPapers,
  getAllCategories,
  getCategory,
  createCategory,
  deleteCategory,
  getPapersByCategory,
  addPaperToCategory,
  removePaperFromCategory,
  createDescription,
  getDescription,
  getDescriptionByPaper,
  updateDescription,
  deleteDescription
};