import  BibLatexParser from 'biblatex-csl-converter';
import fs from 'fs'
import axios from 'axios';
import * as cheerio from 'cheerio';

async function getPublications() {
    const file = fs.readFileSync('src/data/publications.bib', 'utf8');
    let bib = BibLatexParser.parse(file, { processUnexpected: true, processUnknown: true });
    let paper = Object.values(bib.entries);
    paper = paper.sort((a, b) => (a.fields.date < b.fields.date ? 1 : -1));

    let now = new Date();
    let update = Intl.DateTimeFormat(
        'en-US'
    ).format(now);
    
    let years = [... new Set(paper.map(x=>x.fields.date))];

    return({
        total: paper.length,
        paper: paper,
        scholar: await getGoogleScholarData(),
        last_update: update,
        years: years
    });

  };


async function getGoogleScholarData(user="H7sOPf8AAAAJ") {
    const url = `https://scholar.google.com/citations?user=${user}&hl=en`;

		const { data } = await axios.get(url);

		const site = cheerio.load(data);

		const res = [];
		site('table[id=gsc_rsb_st] td:nth-child(2)').each((i, elm) => {
			res.push(parseInt(site(elm).text()));
		});

		return(
			{
				total_citations: res[0],
				h_index: res[1],
				i10_index: res[2]
			}
		);
}

export const publications = await getPublications();