import axios from "axios";
import * as cheerio from "cheerio";

type citations_in_year = {
  year: string;
  number: number;
};

type author = {
  authorId: string;
  name: string;
}

type externalIds = {
  DOI: string,
}

type journal = {
  volume: string;
  pages: string;
  name: string;
}

export type paper = {
  paperId: string;
  externalIds: externalIds;
  title: string;
  year: number;
  isOpenAccess: boolean;
  openAccessPdf: {
    url: string;
  };
  publicationTypes: string[];
  journal: journal;
  authors: author[];
  citationCount: number;
}


var url = 'https://api.semanticscholar.org/graph/v1/author/50644098/papers?fields=title,year,authors,publicationTypes,journal,externalIds,isOpenAccess,openAccessPdf,citationCount'

async function getPublications() {
  const res = await axios.get(url);

  var paper: paper[] = res.data.data;

  paper = paper.filter(function (el) {
    return el.publicationTypes !== null
  })

  paper = paper.sort((a, b) => (a.year < b.year ? 1 : -1));

  let now = new Date();
  let update = Intl.DateTimeFormat("en-US").format(now);

  let years = [...new Set(paper.map((x) => x.year))];
  years = years.sort((a, b) => (a < b ? 1 : -1));


  return {
    total: paper.length,
    paper: paper,
    scholar: await getGoogleScholarData(),
    last_update: update,
    years: years,
  };
}

async function getGoogleScholarData(user = "H7sOPf8AAAAJ") {
  const url = `https://scholar.google.com/citations?user=${user}&hl=en`;

  const { data } = await axios.get(url);

  const site = cheerio.load(data);

  const res = [];
  site("table[id=gsc_rsb_st] td:nth-child(2)").each((i, elm) => {
    res.push(parseInt(site(elm).text()));
  });

  let years: string[] = [];
  site("div[class=gsc_md_hist_b] span[class=gsc_g_t]").each((i, elm) => {
    years.push(site(elm).text());
  });
  let citations: number[] = [];
  site("div[class=gsc_md_hist_b] a[class=gsc_g_a] span").each((i, elm) => {
    citations.push(parseInt(site(elm).text()));
  });

  let citations_per_year: citations_in_year[] = [];
  years.forEach((key, i) => {
    let ct: citations_in_year = {
      year: key,
      number: citations[i],
    };
    citations_per_year.push(ct);
  });

  return {
    total_citations: res[0],
    h_index: res[1],
    i10_index: res[2],
    citations_per_year: citations_per_year,
  };
}

export const publications = await getPublications();
