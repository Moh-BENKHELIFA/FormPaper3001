class Paper {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.authors = data.authors;
    this.publication_date = data.publication_date;
    this.conference = data.conference;
    this.conference_short = data.conference_short;
    this.reading_status = data.reading_status || 'unread';
    this.is_favorite = data.is_favorite || 0;
    this.year = data.year;
    this.month = data.month;
    this.image = data.image;
    this.doi = data.doi;
    this.url = data.url;
    this.folder_path = data.folder_path;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.categories = data.categories || [];
    this.description = data.description;
  }

  static validate(data) {
    const errors = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (!data.authors || data.authors.trim().length === 0) {
      errors.push('Authors are required');
    }

    if (data.reading_status && !['unread', 'reading', 'read'].includes(data.reading_status)) {
      errors.push('Invalid reading status');
    }

    if (data.doi && !this.isValidDOI(data.doi)) {
      errors.push('Invalid DOI format');
    }

    if (data.url && !this.isValidURL(data.url)) {
      errors.push('Invalid URL format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static isValidDOI(doi) {
    const doiRegex = /^10\.\d{4,}\/[-._;()\/<>a-zA-Z0-9]+$/;
    return doiRegex.test(doi);
  }

  static isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      authors: this.authors,
      publication_date: this.publication_date,
      conference: this.conference,
      conference_short: this.conference_short,
      reading_status: this.reading_status,
      is_favorite: this.is_favorite,
      year: this.year,
      month: this.month,
      image: this.image,
      doi: this.doi,
      url: this.url,
      folder_path: this.folder_path,
      created_at: this.created_at,
      updated_at: this.updated_at,
      categories: this.categories,
      description: this.description
    };
  }
}

class Category {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.created_at = data.created_at;
  }

  static validate(data) {
    const errors = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Category name is required');
    }

    if (data.name && data.name.length > 100) {
      errors.push('Category name must be less than 100 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      created_at: this.created_at
    };
  }
}

class Description {
  constructor(data) {
    this.id = data.id;
    this.paper_id = data.paper_id;
    this.texte = data.texte;
    this.images = data.images ? JSON.parse(data.images) : [];
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static validate(data) {
    const errors = [];

    if (!data.paper_id) {
      errors.push('Paper ID is required');
    }

    if (data.images && !Array.isArray(data.images)) {
      errors.push('Images must be an array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toJSON() {
    return {
      id: this.id,
      paper_id: this.paper_id,
      texte: this.texte,
      images: this.images,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

class PaperCategory {
  constructor(data) {
    this.id = data.id;
    this.paper_id = data.paper_id;
    this.category_id = data.category_id;
    this.created_at = data.created_at;
  }

  static validate(data) {
    const errors = [];

    if (!data.paper_id) {
      errors.push('Paper ID is required');
    }

    if (!data.category_id) {
      errors.push('Category ID is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  toJSON() {
    return {
      id: this.id,
      paper_id: this.paper_id,
      category_id: this.category_id,
      created_at: this.created_at
    };
  }
}

module.exports = {
  Paper,
  Category,
  Description,
  PaperCategory
};