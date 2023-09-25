import axios from "axios";

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

export type citations = {
paperId: string;
  externalIds: externalIds;
  title: string;
  year: number;
  journal: journal
}

type citationStyles = {
  bibtex: string;
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
  publicationDate: Date;
  abstract: string;
  citations: citations[];
  tldr: {
    text: string;
  },
  citationStyles: citationStyles
}

var fields = 'title,year,authors,publicationTypes,journal,externalIds,isOpenAccess,openAccessPdf,citationStyles';
fields = fields + ',citationCount,publicationDate,abstract,tldr,citations.year,citations.externalIds,citations.title,citations.journal';

export async function getPublications(id: string) {
  const url = `https://api.semanticscholar.org/graph/v1/paper/${id}?fields=${fields}`
  const res = await axios.get(url);
  const paper: paper = res.data;
  return paper;
}