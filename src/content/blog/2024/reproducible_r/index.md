---
title: "Reproducible R"
subTitle: "A journey to get \"old\" code running again."
publishDate: 2024-07-10
image: "./banner.webp"
imageAlt: "Reproducible R - A journey to get \"old\" code running again."
abstract:
  This article outlines the challenges of revisiting old R code and the solutions to overcome them. Using the Posit Public Package Manager and devcontainers in VS Code, I successfully recreated an environment that supports older versions of R and specific package dependencies, ensuring reproducibility and ease of sharing with colleagues.

---

I recently had to revisit some old R code to work on revisions for a paper. As is often the case, several years had passed since the original analysis. I thought this wouldn’t be an issue since I had recorded all the package versions using `renv`.

However, a lot had changed: I got a new laptop, switched from an x86 to an ARM architecture, and R had advanced from version 4.1 to 4.4. I attempted to restore the old package versions, specifically trying to install an outdated version of Seurat (4.0.2).

```r
> devtools::install_version('Seurat', '4.0.2')
...
ERROR: dependency ‘spatstat.core’ is not available for package ‘Seurat’
```

This didn’t work. I wondered if it was because I was now using a MacBook instead of my previous Linux computer. Trying the same on a clean Linux environment yielded the same error. Old versions of Seurat depend on `spatstat.core`, which was removed from CRAN in 2022 ([spatialstat.core on CRAN](https://cran.r-project.org/package=spatstat.core)).

## Rolling Back Time with Posit Public Package Manager

To solve this, I turned to the [Posit Public Package Manager](https://packagemanager.posit.co/client/#/), which archives old versions of packages. Following their instructions, I set the repository URL to an older snapshot from June 2021 (`options(repos = c(CRAN = "https://packagemanager.posit.co/cran/2021-06-01"))`). Trying to install Seurat again, I encountered a new error:

```r {1,2,5}
PerfectPenttinen.h:25:24: error: ‘DOUBLE_EPS’ was not declared in this scope
   25 |     ishard = (gamma <= DOUBLE_EPS);
      |                        ^~~~~~~~~~
make: *** [/opt/R/4.4.1/lib/R/etc/Makeconf:202: Perfect.o] Error 1
ERROR: compilation failed for package ‘spatstat.core’
* removing ‘/home/vscode/R/x86_64-pc-linux-gnu-library/4.4/spatstat.core’

The downloaded source packages are in
        ‘/tmp/RtmpcqGEEC/downloaded_packages’
Warning message:
In install.packages("spatstat.core") :
  installation of package ‘spatstat.core’ had non-zero exit status
```

Again, after some google searches, I found the solution. The constant `DOUBLE_EPS` is [deprecated](https://github.com/wch/r-source/blob/66b154a9cc17ea32ce024e86f50ffdd67eea224e/src/include/R_ext/Constants.h#L46-L51) in R versions >= 4.3. I was running R 4.4. How could I switch back to an older version of R?

## Using Devcontainers for Reproducibility

I decided to use [devcontainers](https://code.visualstudio.com/docs/devcontainers/containers) in VS Code, using an Ubuntu 20.04 base image and installing R with [rig](https://github.com/rocker-org/devcontainer-features/blob/main/src/r-rig/README.md).

```json title="devcontainer.json" {5-11}
{
 "name": "R time travel",
 // Ubuntu image
 "image": "mcr.microsoft.com/devcontainers/base:ubuntu-20.04",
    "features": {
      "ghcr.io/rocker-org/devcontainer-features/r-rig:latest": {
        "version": "4.1.2",
        "installRadian": true,
        "installJupyterlab": true,
        "installRMarkdown": true
      },
    },
 // Uncomment to connect as root instead. More info: https://aka.ms/dev-containers-non-root.
 "remoteUser": "vscode"
}
```

After setting the repository as mentioned above, I successfully installed Seurat version 4.0.2. However, I wanted a more streamlined approach. The Rocker project provides an easy solution with the [r-packages](https://github.com/rocker-org/devcontainer-features/blob/main/src/r-packages/README.md) devcontainer feature, allowing packages to be installed upon container creation.

``` json title="devcontainer.json" {6-11}
// ...
"features": {
  "ghcr.io/rocker-org/devcontainer-features/r-rig:latest": {
    ...
  },
  "ghcr.io/rocker-org/devcontainer-features/r-packages:1": {
    "packages": "Seurat@4.0.2, devtools, languageserver, BiocManager",
    "installSystemRequirements": true,
    // Set the CRAN snapshot
    "cranMirror": "https://packagemanager.posit.co/cran/__linux__/focal/2021-06-01"
  }
},
// ...
```

Now we have our conatiner up and running, however as soon as we start installing additional packages, they will be pulled from the up-to-date CRAN server.
To ensure the use of old mirrors by default, I created a [`Profile.site`](https://support.posit.co/hc/en-us/articles/360047157094-Managing-R-with-Rprofile-Renviron-Rprofile-site-Renviron-site-rsession-conf-and-repos-conf) file specifying the snapshot date and BioConductor mirror. Adding one line to the JSON file ensured this file was copied to the correct location upon container creation.

```r title="Profile.site"
# Configure BioCManager to use Posit Package Manager:
options(BioC_mirror = "https://packagemanager.posit.co/bioconductor")
options(BIOCONDUCTOR_CONFIG_FILE = "https://packagemanager.posit.co/bioconductor/config.yaml")

# Configure a CRAN snapshot compatible with Bioconductor 3.14:
options(repos = c(CRAN = "https://packagemanager.posit.co/cran/__linux__/focal/2021-06-01"))
```

Within that file, we can again specify the date of the snapshot we want to use, and we can also specify a mirror for BioConductor packages. The last thing we have to do is to copy that file into the appropriate location upon creation of the devcontainer. We simply need to add one line to the JSON file.

```json title="devcontainer.json"
// Make sure that the version of R matches the version install with rig
"postCreateCommand": "sudo cp .devcontainer/Rprofile.site /opt/R/4.1.2/lib/R/etc/Rprofile.site",
```

## Conclusion

With this setup, I created a devcontainer that allows using an older version of R to install packages as they were in 2021, within a reproducible environment easily shared with others.

### Verification

One last check to make sure that everything is working correctly:

```r {3,5,19}
library(Seurat)
options()$repos
# CRAN: 'https://packagemanager.posit.co/cran/__linux__/focal/2021-06-01'
sessionInfo()
# R version 4.1.2 (2021-11-01)
# Platform: x86_64-pc-linux-gnu (64-bit)
# Running under: Ubuntu 20.04.6 LTS

# Matrix products: default
# BLAS/LAPACK: /usr/lib/x86_64-linux-gnu/openblas-pthread/libopenblasp-r0.3.8.so

# locale:
# [1] C

# attached base packages:
# [1] stats     graphics  grDevices utils     datasets  methods   base     

# other attached packages:
# [1] SeuratObject_4.0.1 Seurat_4.0.2      
```
