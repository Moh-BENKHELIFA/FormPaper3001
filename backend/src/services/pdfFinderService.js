const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Service pour trouver des PDFs d'articles scientifiques
 * Sources dans l'ordre :
 * 1. Unpaywall (open access légal)
 * 2. URL directe depuis l'article
 * 3. CrossRef
 * 4. ArXiv
 * 5. Sci-Hub
 */
class PdfFinderService {
  constructor() {
    this.email = 'formpaper3001@example.com'; // Email pour Unpaywall
    this.timeout = 15000; // 15 secondes timeout
  }

  /**
   * Chercher un PDF avec toutes les sources disponibles
   * @param {Object} item - Item Zotero avec DOI, URL, titre, etc.
   * @returns {Promise<Object>} { success, pdfUrl, source, error }
   */
  async findPdf(item) {
    const doi = item.data?.DOI;
    const url = item.data?.url;
    const title = item.data?.title;
    const results = [];

    console.log(`🔍 Searching PDF for: ${title}`);

    // 1. Unpaywall (Open Access légal)
    if (doi) {
      const unpaywallResult = await this.tryUnpaywall(doi);
      results.push({ source: 'Unpaywall', ...unpaywallResult });
      if (unpaywallResult.success) {
        return unpaywallResult;
      }
    }

    // 2. URL directe
    if (url) {
      const directResult = await this.tryDirectUrl(url);
      results.push({ source: 'Direct URL', ...directResult });
      if (directResult.success) {
        return directResult;
      }
    }

    // 3. CrossRef
    if (doi) {
      const crossrefResult = await this.tryCrossRef(doi);
      results.push({ source: 'CrossRef', ...crossrefResult });
      if (crossrefResult.success) {
        return crossrefResult;
      }
    }

    // 4. ArXiv
    if (title) {
      const arxivResult = await this.tryArxiv(title);
      results.push({ source: 'ArXiv', ...arxivResult });
      if (arxivResult.success) {
        return arxivResult;
      }
    }

    // 5. Sci-Hub (dernier recours)
    if (doi) {
      const scihubResult = await this.trySciHub(doi);
      results.push({ source: 'Sci-Hub', ...scihubResult });
      if (scihubResult.success) {
        return scihubResult;
      }
    }

    // Aucune source n'a trouvé le PDF
    console.log(`❌ No PDF found for: ${title}`);
    console.log('Tried sources:', results.map(r => `${r.source}: ${r.error || 'not found'}`));

    return {
      success: false,
      error: 'PDF not found in any source',
      attemptedSources: results
    };
  }

  /**
   * 1. Unpaywall API (Open Access légal)
   */
  async tryUnpaywall(doi) {
    try {
      console.log(`  📚 Trying Unpaywall for DOI: ${doi}`);
      const response = await axios.get(
        `https://api.unpaywall.org/v2/${doi}`,
        {
          params: { email: this.email },
          timeout: this.timeout
        }
      );

      if (response.data.best_oa_location?.url_for_pdf) {
        const pdfUrl = response.data.best_oa_location.url_for_pdf;
        console.log(`  ✅ Found on Unpaywall: ${pdfUrl}`);
        return {
          success: true,
          pdfUrl,
          source: 'Unpaywall (Open Access)'
        };
      }

      return { success: false, error: 'No OA version available' };
    } catch (error) {
      console.log(`  ❌ Unpaywall failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 2. Essayer l'URL directe
   */
  async tryDirectUrl(url) {
    try {
      console.log(`  🔗 Trying direct URL: ${url}`);

      // Si l'URL se termine par .pdf, c'est probablement un PDF direct
      if (url.toLowerCase().endsWith('.pdf')) {
        // Vérifier que le fichier existe
        const response = await axios.head(url, {
          timeout: this.timeout,
          maxRedirects: 5
        });

        if (response.headers['content-type']?.includes('pdf')) {
          console.log(`  ✅ Found PDF at direct URL`);
          return {
            success: true,
            pdfUrl: url,
            source: 'Direct URL'
          };
        }
      }

      // Sinon, essayer de charger la page et trouver un lien PDF
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);

      // Chercher des liens vers des PDFs
      const pdfLinks = $('a[href$=".pdf"], a[href*="pdf"]').map((i, el) => $(el).attr('href')).get();

      if (pdfLinks.length > 0) {
        // Prendre le premier lien PDF trouvé
        let pdfUrl = pdfLinks[0];
        // Convertir en URL absolue si nécessaire
        if (!pdfUrl.startsWith('http')) {
          const baseUrl = new URL(url);
          pdfUrl = new URL(pdfUrl, baseUrl.origin).href;
        }

        console.log(`  ✅ Found PDF link on page: ${pdfUrl}`);
        return {
          success: true,
          pdfUrl,
          source: 'Direct URL (page scan)'
        };
      }

      return { success: false, error: 'No PDF link found on page' };
    } catch (error) {
      console.log(`  ❌ Direct URL failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 3. CrossRef API
   */
  async tryCrossRef(doi) {
    try {
      console.log(`  📖 Trying CrossRef for DOI: ${doi}`);
      const response = await axios.get(
        `https://api.crossref.org/works/${doi}`,
        { timeout: this.timeout }
      );

      const work = response.data.message;

      // CrossRef peut avoir des liens vers des PDFs
      if (work.link) {
        for (const link of work.link) {
          if (link['content-type'] === 'application/pdf') {
            console.log(`  ✅ Found PDF link on CrossRef: ${link.URL}`);
            return {
              success: true,
              pdfUrl: link.URL,
              source: 'CrossRef'
            };
          }
        }
      }

      return { success: false, error: 'No PDF link in CrossRef metadata' };
    } catch (error) {
      console.log(`  ❌ CrossRef failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 4. ArXiv search
   */
  async tryArxiv(title) {
    try {
      console.log(`  📄 Trying ArXiv for title: ${title}`);

      // Rechercher sur ArXiv API
      const response = await axios.get(
        'http://export.arxiv.org/api/query',
        {
          params: {
            search_query: `ti:"${title}"`,
            max_results: 1
          },
          timeout: this.timeout
        }
      );

      // Parser le XML de réponse
      const $ = cheerio.load(response.data, { xmlMode: true });
      const entry = $('entry').first();

      if (entry.length > 0) {
        const arxivId = entry.find('id').text().split('/abs/')[1];
        if (arxivId) {
          const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
          console.log(`  ✅ Found on ArXiv: ${pdfUrl}`);
          return {
            success: true,
            pdfUrl,
            source: 'ArXiv'
          };
        }
      }

      return { success: false, error: 'Not found on ArXiv' };
    } catch (error) {
      console.log(`  ❌ ArXiv failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 5. Sci-Hub (dernier recours - controversé légalement)
   */
  async trySciHub(doi) {
    try {
      console.log(`  🏴‍☠️ Trying Sci-Hub for DOI: ${doi}`);

      // Miroirs Sci-Hub connus (peuvent changer)
      const scihubMirrors = [
        'https://sci-hub.se',
        'https://sci-hub.st',
        'https://sci-hub.ru'
      ];

      for (const mirror of scihubMirrors) {
        try {
          const response = await axios.get(`${mirror}/${doi}`, {
            timeout: this.timeout,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            maxRedirects: 5
          });

          const $ = cheerio.load(response.data);

          // Sci-Hub affiche le PDF dans un iframe ou un embed
          let pdfUrl = $('#pdf').attr('src') || $('embed[type="application/pdf"]').attr('src');

          if (pdfUrl) {
            // Convertir en URL absolue
            if (pdfUrl.startsWith('//')) {
              pdfUrl = 'https:' + pdfUrl;
            } else if (pdfUrl.startsWith('/')) {
              pdfUrl = mirror + pdfUrl;
            }

            console.log(`  ✅ Found on Sci-Hub (${mirror}): ${pdfUrl}`);
            return {
              success: true,
              pdfUrl,
              source: 'Sci-Hub (⚠️ légalité variable selon juridiction)'
            };
          }
        } catch (err) {
          // Essayer le miroir suivant
          continue;
        }
      }

      return { success: false, error: 'Not available on Sci-Hub mirrors' };
    } catch (error) {
      console.log(`  ❌ Sci-Hub failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Télécharger un PDF depuis une URL
   */
  async downloadPdf(pdfUrl) {
    try {
      console.log(`📥 Downloading PDF from: ${pdfUrl}`);
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60 secondes pour le téléchargement
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        maxRedirects: 10
      });

      if (response.data && response.data.byteLength > 0) {
        console.log(`✅ PDF downloaded successfully (${response.data.byteLength} bytes)`);
        return Buffer.from(response.data);
      }

      throw new Error('Downloaded file is empty');
    } catch (error) {
      console.log(`❌ Download failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new PdfFinderService();
