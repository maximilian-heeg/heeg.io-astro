---
title: "Designing Xenium Probes"
subTitle: "Designing Xenium Probes for Fluorochromes: Avoiding Cross-Reaction with Mouse Transcriptome"
publishDate: 2024-08-29
image: "./output.png"
imageAlt: ""
abstract:
  This blog post explores the intricate process of designing Xenium probes for fluorochromes, with a focus on avoiding cross-reaction with the mouse transcriptome.

---


In this blog post, we'll explore the process of designing Xenium probes for fluorochromes while ensuring they don't cross-react with the mouse transcriptome. This is crucial for maintaining the specificity and accuracy of spatial transcriptomics experiments using the Xenium platform.

## Introduction

Xenium is a powerful spatial transcriptomics platform that allows for in situ analysis of gene expression. When designing probes for this system, especially for fluorochromes commonly used in mouse models, it's essential to avoid cross-reactivity with the mouse transcriptome. This ensures that our probes are specific to our fluorochromes of interest and don't produce false positive signals from mouse transcripts.

## The Probe Design Process

Our probe design process involves several key steps:

1. Setting up the validation environment
2. Creating a KmerFinder class for sequence analysis
3. Implementing a wrapper function for padlock probe finding
4. Analyzing specific fluorochrome sequences

Let's go through each of these steps in detail.

## Setting Up the Validation Environment

First, we need to set up our validation environment. We use a `PadlockValidator` class that checks various properties of our potential probe sequences. 

```python
import subprocess
import tempfile
from tempfile import _TemporaryFileWrapper, TemporaryDirectory
from dataclasses import dataclass
import pandas as pd
from tqdm import tqdm
import dill


@dataclass
class ValidationResult:
    """
    Dataclass to store the results of padlock sequence validation.

    Attributes:
        name (str): The name of the sequence.
        sequence (str): The validated padlock sequence.
        melting_temperature (float): The calculated melting temperature of the sequence.
        junction_preference (str): The preference level of the junction sequence.
        has_repetitive_g (bool): Whether the sequence contains repetitive G nucleotides.
        delta_g (float): The minimum free energy of the folded sequence.
        alignments (List[str]): List of potential alignment locations in the reference.
    """

    name: str
    sequence: str
    melting_temperature: float
    junction_preference: str
    has_repetitive_g: bool
    delta_g: float
    alignments: list[str]

    def __str__(self) -> str:
        """
        Returns a string representation of the ValidationResult.

        Returns:
            str: A formatted string containing the validation results.
        """

        alignment_str = "\n".join(
            f"    {a}"
            for alignment in self.alignments
            for a in str(alignment).split("\n")
        )

        return (
            f"Validation Result for {self.name}:\n"
            f"  Sequence: {self.sequence}\n"
            f"  Melting Temperature: {self.melting_temperature:.2f}°C\n"
            f"  Junction Preference: {self.junction_preference}\n"
            f"  Has Repetitive G: {'Yes' if self.has_repetitive_g else 'No'}\n"
            f"  Delta G: {self.delta_g:.2f} kcal/mol\n"
            f"  Alignments: {len(self.alignments)}\n"
            f"{alignment_str}"
        )


@dataclass
class AlignmentData:
    """
    Dataclass to store information about a single alignment.

    Attributes:
        start (int): The start position of the alignment.
        end (int): The end position of the alignment.
        matches (int): The number of matching nucleotides in the alignment.
        length (int): The total length of the alignment.
    """

    start: int
    end: int
    matches: int
    length: int

    def __str__(self) -> str:
        """
        Returns a string representation of the AlignmentData.

        Returns:
            str: A formatted string describing the alignment.
        """
        return f"From {self.start} to {self.end} with {self.matches} of {self.length} matching nucleotides"


@dataclass
class Alignment:
    """
    Dataclass to store information about all alignments for a sequence.

    Attributes:
        name (str): The name of the sequence or reference.
        data (List[AlignmentData]): A list of AlignmentData objects representing individual alignments.
    """

    name: str
    data: list[AlignmentData]

    def n(self) -> int:
        """
        Returns the number of alignments.

        Returns:
            int: The number of AlignmentData objects in the data list.
        """
        return len(self.data)

    def __str__(self) -> str:
        """
        Returns a string representation of the Alignment.

        Returns:
            str: A formatted string describing all alignments for the sequence.
        """
        s = f"{self.n()} alignments to {self.name}"
        for a in self.data:
            s = s + "\n - " + str(a)
        return s


class PadlockValidator:
    """
    A class to validate padlock sequences for Xenium
    """

    padlock_length: int = 40
    PRIMER3_CALCTM_ARGS: dict = {
        "mv_conc": 10,
        "dv_conc": 20,
        "dntp_conc": 10,
        "dna_conc": 5000,
        "salt_corrections_method": "schildkraut",
    }

    JUNCTION_PREFERENCES: dict[str, str] = {
        "AT": "preferred",
        "TA": "preferred",
        "GA": "preferred",
        "AG": "preferred",
        "TT": "neutral",
        "CT": "neutral",
        "CA": "neutral",
        "TC": "neutral",
        "AC": "neutral",
        "CC": "neutral",
        "TG": "neutral",
        "AA": "neutral",
        "CG": "non-preferred",
        "GT": "non-preferred",
        "GG": "non-preferred",
        "GC": "non-preferred",
    }

    def __init__(self, reference_fasta: str) -> None:
        """
        Initialize the PadlockValidator with a reference FASTA file.

        Args:
            reference_fasta (str): Path to the reference FASTA file.
        """
        self.reference_dir: TemporaryDirectory = self._create_reference(reference_fasta)

    def _create_reference(self, fasta_files: str) -> TemporaryDirectory:
        """
        Create a BLAST database from the reference FASTA file.

        Args:
            fasta (str): Path to the reference FASTA file.

        Returns:
            TemporaryDirectory: A temporary directory containing the BLAST database.
        """
        tempdir = tempfile.TemporaryDirectory()

        if isinstance(fasta_files, str):
            fasta_files = [fasta_files]

        # If there's only one file, use it directly
        if len(fasta_files) == 1:
            input_fasta = fasta_files[0]
        else:
            # Create a temporary file to store the merged FASTA content
            merged_fasta = tempfile.NamedTemporaryFile()

            # Merge FASTA files using cat
            cat_command = ["cat"] + fasta_files
            with open(merged_fasta.name, "w") as outfile:
                subprocess.run(cat_command, stdout=outfile, check=True)

            input_fasta = merged_fasta.name

        subprocess.run(
            [
                "./bin/makeblastdb",
                "-in",
                input_fasta,
                "-title",
                "reference",
                "-dbtype",
                "nucl",
                "-out",
                tempdir.name,
            ]
        )
        return tempdir

    def validate_sequence(self, sequence: str, name: str = "") -> ValidationResult:
        """
        Validate a given padlock sequence.

        Args:
            sequence (str): The padlock sequence to validate.

        Returns:
            ValidationResult: A dataclass containing the validation results.

        Raises:
            ValueError: If the sequence length is not 40 bp or contains invalid nucleotides.
        """
        sequence = sequence.upper().strip()
        if len(sequence) != self.padlock_length:
            raise ValueError(
                f"Sequence needs to be {self.padlock_length} bp long, current sequence is {len(sequence)} bp long"
            )
        if any(n not in "ATGC" for n in sequence):
            raise ValueError("Nucleotides must be from 'A', 'T', 'G', 'C'")

        query_file = self._create_temporary_fasta(sequence=sequence)
        matches = self._find_matches_in_reference(query_file)
        return ValidationResult(
            name=name,
            sequence=sequence,
            melting_temperature=self._calc_tm(sequence),
            junction_preference=self._check_junction(sequence),
            has_repetitive_g="GGGGG" in sequence,
            delta_g=self._calc_delta_g(sequence),
            alignments=matches,
        )

    def _check_junction(self, sequence: str) -> str:
        """
        Check the junction preference of the given sequence.

        Args:
            sequence (str): The padlock sequence to check.

        Returns:
            str: The junction preference (preferred, neutral, or non-preferred).
        """
        junction = sequence[19:21]
        return self.JUNCTION_PREFERENCES[junction]

    def _calc_tm(self, sequence: str) -> float:
        """
        Calculate the melting temperature of the given sequence.

        Args:
            sequence (str): The padlock sequence.

        Returns:
            float: The calculated melting temperature.
        """
        import primer3

        return primer3.calc_tm(sequence, **self.PRIMER3_CALCTM_ARGS)

    def _find_matches_in_reference(
        self, query_file: _TemporaryFileWrapper
    ) -> list[str]:
        """
        Find potential matches of the query sequence in the reference database.

        Args:
            query_file (_TemporaryFileWrapper): A temporary file containing the query sequence in FASTA format.

        Returns:
            List[str]: A list of potential alignment locations in the reference.
        """
        import tempfile
        import subprocess
        from Bio.Blast import NCBIXML
        import re

        tmp = tempfile.NamedTemporaryFile()
        subprocess.run(
            [
                "./bin/blastn",
                "-out",
                tmp.name,
                "-outfmt",
                "5",
                "-query",
                query_file.name,
                "-db",
                self.reference_dir.name,
                "-evalue",
                "0.001",
                "-word_size",
                "7",
                "-num_threads",
                "8",
            ]
        )
        result_handle = open(tmp.name)
        blast_record = NCBIXML.read(result_handle)
        matches: list[Alignment] = []
        for alignment in blast_record.alignments:
            alignment_data: list[AlignmentData] = []
            for hsp in alignment.hsps:
                longest_consecutive_match = max(len(s) for s in hsp.match.split(" "))
                if longest_consecutive_match >= 12 or hsp.match.count("|") >= 36:
                    alignment_data.append(
                        AlignmentData(
                            start=hsp.sbjct_start,
                            end=hsp.sbjct_end,
                            matches=hsp.match.count("|"),
                            length=self.padlock_length,
                        )
                    )
            if len(alignment_data):
                pattern = r"gnl\|BL_ORD_ID\|\d+ "
                cleaned_title = re.sub(pattern, "", alignment.title)
                matches.append(Alignment(cleaned_title, alignment_data))
        return matches

    def _calc_delta_g(self, dna_sequence: str, temp: float = 50.0) -> bool:
        """
        Returns the minimum free energy of the folded sequence

        Args:
            dna_sequence (str): The DNA sequence to check.
            temp (float, optional): The temperature for the calculation. Defaults to 50.0.

        Returns:
            float: The minimum free energy of the folded sequence.
        """
        from seqfold import dg

        delta_g = dg(dna_sequence, temp=temp)
        return delta_g

    def _create_temporary_fasta(self, sequence: str) -> _TemporaryFileWrapper:
        """
        Create a temporary FASTA file containing the given sequence.

        Args:
            sequence (str): The DNA sequence to write to the FASTA file.

        Returns:
            _TemporaryFileWrapper: A temporary file wrapper containing the FASTA formatted sequence.
        """
        import tempfile

        tmp = tempfile.NamedTemporaryFile()
        with open(tmp.name, "w") as file:
            file.write(">temp_query\n" + str(sequence))
        return tmp

    @staticmethod
    def create_dataframe_from_results(results: list[ValidationResult]) -> pd.DataFrame:
        """
        Create a pandas DataFrame from a list of ValidationResult objects.

        Args:
            results (List[ValidationResult]): A list of ValidationResult objects.

        Returns:
            pd.DataFrame: A DataFrame containing the validation results.
        """
        data = []
        for result in results:
            row = {
                "Name": result.name,
                "Sequence": result.sequence,
                "Melting Temperature": result.melting_temperature,
                "Junction Preference": result.junction_preference,
                "Has Repetitive G": result.has_repetitive_g,
                "Delta G": result.delta_g,
                "Number of Alignments": len(result.alignments),
                "Alignments": "\n\n".join(str(a) for a in result.alignments)
                if result.alignments
                else "None",
            }
            data.append(row)

        return pd.DataFrame(data)

    @staticmethod
    def export_results_to_excel(
        results: list[ValidationResult], output_file: str
    ) -> None:
        """
        Create an Excel file from the validation results with specified formatting using XlsxWriter.

        Args:
            results (List[ValidationResult]): A list of ValidationResult objects.
            output_file (str): The path and filename for the output Excel file.
        """
        import xlsxwriter

        df = PadlockValidator.create_dataframe_from_results(results)

        # Create a new workbook and add a worksheet
        workbook = xlsxwriter.Workbook(output_file)
        worksheet = workbook.add_worksheet()

        # Define formats
        header_format = workbook.add_format(
            {"bold": True, "align": "center", "valign": "vcenter"}
        )
        red_format = workbook.add_format({"bg_color": "#ba3d3d"})
        yellow_format = workbook.add_format({"bg_color": "#edc647"})
        green_format = workbook.add_format({"bg_color": "#3dba3d"})
        monospace_format = workbook.add_format(
            {"font_name": "Courier New", "align": "left", "valign": "vcenter"}
        )
        wrap_format = workbook.add_format({"text_wrap": True, "valign": "top"})

        # Write the DataFrame to the worksheet
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(0, col_num, value, header_format)

        for row_num, row in enumerate(df.values):
            for col_num, value in enumerate(row):
                if col_num == 1:  # Sequence column
                    worksheet.write(row_num + 1, col_num, value, monospace_format)
                elif col_num == 7:  # Alignments column
                    worksheet.write(row_num + 1, col_num, value, wrap_format)
                else:
                    worksheet.write(row_num + 1, col_num, value)

        # Apply conditional formatting
        worksheet.conditional_format(
            1,
            2,
            len(df),
            2,
            {
                "type": "cell",
                "criteria": "less than",
                "value": 68,
                "format": red_format,
            },
        )
        worksheet.conditional_format(
            1,
            2,
            len(df),
            2,
            {
                "type": "cell",
                "criteria": "greater than",
                "value": 82,
                "format": red_format,
            },
        )

        worksheet.conditional_format(
            1,
            3,
            len(df),
            3,
            {
                "type": "text",
                "criteria": "containing",
                "value": "preferred",
                "format": green_format,
            },
        )
        worksheet.conditional_format(
            1,
            3,
            len(df),
            3,
            {
                "type": "text",
                "criteria": "containing",
                "value": "neutral",
                "format": yellow_format,
            },
        )
        worksheet.conditional_format(
            1,
            3,
            len(df),
            3,
            {
                "type": "text",
                "criteria": "containing",
                "value": "non-preferred",
                "format": red_format,
            },
        )

        # Number of Alignments color gradient
        worksheet.conditional_format(
            1,
            6,
            len(df),
            6,
            {
                "type": "2_color_scale",
                "min_color": "#3dba3d",
                "max_color": "#ba3d3d",
                "min_type": "num",
                "max_type": "num",
                "min_value": 1,
                "max_value": 5,
            },
        )

        # Adjust column widths
        for col_num, column in enumerate(df.columns):
            max_length = max(df[column].astype(str).map(len).max(), len(column))
            worksheet.set_column(
                col_num, col_num, min(max_length + 2, 50)
            )  # Cap width at 50

        # Set a larger height for rows to accommodate wrapped text
        worksheet.set_default_row(60)

        workbook.close()
```

Here's how we initialize it:

```python
validator = PadlockValidator(
    reference_fasta=[
        "reference/gencode.vM35.transcripts.fa",
        "reference/fourochromes.fa",
    ]
)
```

This validator uses both the mouse transcriptome (gencode.vM35.transcripts.fa) and our fluorochrome sequences (fourochromes.fa) as reference databases.

## Creating the KmerFinder Class

Next, we create a `KmerFinder` class that uses our validator to analyze potential probe sequences. This class has methods for finding k-mers, validating them, and visualizing the results. Here's a snippet of the class definition:

```python
import matplotlib.pyplot as plt
import matplotlib.patches as patches


class KmerFinder:
    """
    A class to find and validate k-mers from a given sequence using a PadlockValidator.
    """

    def __init__(self, validator: PadlockValidator) -> None:
        """
        Initialize the KmerFinder with a PadlockValidator instance.

        Args:
            validator (PadlockValidator): An instance of PadlockValidator for sequence validation.
        """
        self.validator = validator

    def find_kmers(self, sequence: str, kmer_length: int) -> list[str]:
        """
        Find all k-mers of the given length in the provided sequence.

        Args:
            sequence (str): The sequence from which to extract k-mers.
            kmer_length (int): The length of each k-mer.

        Returns:
            list[str]: A list of k-mers.
        """
        return [
            sequence[i : i + kmer_length]
            for i in range(len(sequence) - kmer_length + 1)
        ]

    def validate_kmers(self, kmers: list[str]) -> list[ValidationResult]:
        """
        Validate each k-mer using the PadlockValidator.

        Args:
            kmers (list[str]): A list of k-mers to validate.

        Returns:
            list[ValidationResult]: A list of ValidationResult objects.
        """
        return [
            self.validator.validate_sequence(kmer, name=i)
            for i, kmer in tqdm(enumerate(kmers))
        ]

    def process_sequence(
        self, sequence: str, kmer_length: int
    ) -> list[ValidationResult]:
        """
        Find, validate, and process k-mers from a given sequence.

        Args:
            sequence (str): The sequence to process.
            kmer_length (int): The length of each k-mer.
            output_csv (str): Path to the output CSV file.

        Returns:
            list[ValidationResult]: A list of ValidationResult objects.
        """
        kmers = self.find_kmers(sequence, kmer_length)
        results = self.validate_kmers(kmers)
        return results

    @staticmethod
    def filter_validation_results(
        results: list[ValidationResult],
        temperature: tuple[int, int] = (68, 82),
        alignments: int = 1,
        repetitive_g: bool = True,
        junctions: list[str] = ["preferred"],
    ) -> list[ValidationResult]:
        filtered_results = []

        for result in results:
            # Check temperature criterion
            if (result.melting_temperature >= temperature[0]) and (
                result.melting_temperature <= temperature[1]
            ):
                # Check alignments criterion
                if len(result.alignments) <= alignments:
                    # Check repetitive G criterion
                    if not repetitive_g or not result.has_repetitive_g:
                        # Check junction preference criterion
                        if result.junction_preference in junctions:
                            filtered_results.append(result)

        return filtered_results

    @staticmethod
    def plot_results(
        kmers: list[ValidationResult],
        sequence_name: str,
        sequence_length: int,
        temperature: tuple[int, int] = (68, 82),
        alignments: int = 1,
        repetitive_g: bool = True,
        junctions: list[str] = ["preferred"],
    ) -> None:
        """
        Plot the preferred k-mers on a graphical representation of the sequence.

        Args:


        Returns:
            fig, ax
        """

        kmers = KmerFinder.filter_validation_results(
            results=kmers,
            temperature=temperature,
            alignments=alignments,
            repetitive_g=repetitive_g,
            junctions=junctions,
        )

        fig, ax = plt.subplots(1, 1, dpi=400)
        ax.set_xlim(0, sequence_length)

        full_rows: dict[int, int] = {0: 0}
        for kmer in kmers:
            for a in kmer.alignments:
                if a.name == sequence_name:
                    end = max([x.end for x in a.data])
                    start = min([x.start for x in a.data])
                    row_pos = 0
                    while row_pos in full_rows.keys() and full_rows[row_pos] >= start:
                        row_pos += 1
                    full_rows[row_pos] = end
                    for x in a.data:
                        rect = patches.Rectangle(
                            (x.start, row_pos),
                            x.end - x.start,
                            0.8,
                            linewidth=1,
                            edgecolor="black",
                            facecolor="#EAEAEA",
                        )
                        ax.add_patch(rect)
                        ax.text(
                            x.start + ((x.end - x.start) / 2),
                            row_pos + 0.15,
                            f"{x.start} - {x.end} ({x.matches}/{x.length})",
                            fontsize=6,
                            ha="center",
                        )
                    if len(a.data) > 1:
                        for line in range(len(a.data) - 1):
                            print(
                                "line",
                                a.data[line].end,
                                row_pos + 0.4,
                                a.data[line + 1].start,
                                row_pos + 0.4,
                            )
                            ax.plot(
                                [a.data[line].end, a.data[line + 1].start],
                                [row_pos + 0.4, row_pos + 0.4],
                                c="#888888",
                            )

        ax.set_ylim(0, max(full_rows.keys()) + 1)
        ax.set_title(f"{sequence_name} ({sequence_length} nt)")
        ax.get_yaxis().set_visible(False)
        ax.spines[["right", "top", "left"]].set_visible(False)
        fig.set_size_inches(sequence_length/40, (max(full_rows.keys()) + 1)/4)
        return fig, ax
```

## Implementing the Wrapper Function

We then create a wrapper function `find_padlocks` that streamlines the process of finding and validating potential padlock probes for a given sequence:

```python
def find_padlocks(name: str, sequence: str, kmer_length=40):
    import hashlib
    import os
    import dill

    hasher = hashlib.sha1(f"{name}_{sequence}_{kmer_length}".encode())
    hash = hasher.hexdigest()[:10]

    dill_file = os.path.join("results", f"{name}_{hash}.plk")
    excel_file = os.path.join("results", f"{name}_{hash}.xlsx")

    if os.path.isfile(dill_file):
        print("Loading cached file")
        with open(dill_file, "rb") as f:
            res = dill.load(f)
    else:
        res = kmer_finder.process_sequence(sequence, kmer_length)
        with open(dill_file, "wb") as f:
            dill.dump(res, f)

    PadlockValidator.export_results_to_excel(res, excel_file)
    return res

kmer_finder = KmerFinder(validator)
```

This function processes a given sequence, caches the results for faster future access, and exports the results to an Excel file for easy viewing.

## Analyzing Fluorochrome Sequences

With our tools in place, we can now analyze specific fluorochrome sequences. Let's look at the example of eGFP:

```python
gfp_sequence = "atggtgagcaagggcgaggagctgttcaccggggtggtgcccatcctggtcgagctggacggcgacgtaaacggccacaagttcagcgtgtctggcgagggcgagggcgatgccacctacggcaagctgaccctgaagttcatctgcaccaccggcaagctgcccgtgccctggcccaccctcgtgaccaccctgacctacggcgtgcagtgcttcagccgctaccccgaccacatgaagcagcacgacttcttcaagtccgccatgcccgaaggctacgtccaggagcgcaccatcttcttcaaggacgacggcaactacaagacccgcgccgaggtgaagttcgagggcgacaccctggtgaaccgcatcgagctgaagggcatcgacttcaaggaggacggcaacatcctggggcacaagctggagtacaactacaacagccacaacgtctatatcatggccgacaagcagaagaacggcatcaaggcgaacttcaagatccgccacaacatcgaggacggcagcgtgcagctcgccgaccactaccagcagaacacccccatcggcgacggccccgtgctgctgcccgacaaccactacctgagcacccagtccgccctgagcaaagaccccaacgagaagcgcgatcacatggtcctgctggagttcgtgaccgccgccgggatcactctcggcatggacgagctgtacaagtaa"
res = find_padlocks("eGFP", sequence=gfp_sequence)
```

After processing the sequence, we can visualize the results:

```python
KmerFinder.plot_results(res, "eGFP", len(gfp_sequence), alignments=1)
```

This will generate a plot showing potential probe locations along the eGFP sequence that meet our criteria for specificity and lack of cross-reactivity with the mouse transcriptome.

## Results and Interpretation

The resulting plot will show regions of the eGFP sequence where potential probes meet our criteria. Each horizontal bar represents a potential probe, with its position along the x-axis corresponding to its location in the eGFP sequence. The y-axis represents different non-overlapping probes.

Ideal probes will have:
1. A melting temperature between 68°C and 82°C
2. No more than one alignment to the reference database
3. No repetitive G sequences
4. A preferred junction sequence

By visualizing the results this way, we can quickly identify regions of the fluorochrome sequence that are suitable for probe design, avoiding overlapping sequences.

## Conclusion

Designing Xenium probes for fluorochromes while avoiding cross-reaction with the mouse transcriptome is a crucial step in developing specific and accurate spatial transcriptomics experiments. By using computational tools like the ones we've developed here, we can efficiently identify optimal probe sequences that will provide clean, specific signals in our Xenium experiments.

This approach can be extended to other fluorochromes and even to designing probes for specific genes of interest, always ensuring that we maintain specificity and avoid cross-reactivity with the host transcriptome.

Remember, while these computational tools are powerful, it's always important to validate your probes experimentally before using them in large-scale studies. Happy probe designing!