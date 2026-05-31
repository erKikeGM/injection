PDF=main.pdf
TEX=main.tex
BIB=references.bib
LATEXMK=latexmk
LATEXMK_FLAGS=-pdf -interaction=nonstopmode -halt-on-error
DOCKER=docker
TEXLIVE_IMAGE=texlive/texlive:latest
HOST_UID=$(shell id -u)
HOST_GID=$(shell id -g)

.PHONY: all local docker clean distclean

all: $(PDF)

$(PDF): $(TEX) $(BIB)
	@if command -v $(LATEXMK) >/dev/null 2>&1; then \
		$(MAKE) local; \
	elif command -v $(DOCKER) >/dev/null 2>&1; then \
		$(MAKE) docker; \
	else \
		echo "No LaTeX compiler found. Install latexmk/pdflatex or Docker, then run make again."; \
		exit 1; \
	fi

local:
	$(LATEXMK) $(LATEXMK_FLAGS) $(TEX)

docker:
	$(DOCKER) run --rm --user "$(HOST_UID):$(HOST_GID)" -v "$(CURDIR):/work" -w /work $(TEXLIVE_IMAGE) $(LATEXMK) $(LATEXMK_FLAGS) $(TEX)

clean:
	rm -f main.aux main.bbl main.blg main.fdb_latexmk main.fls main.log main.out main.synctex.gz main.toc

distclean: clean
	rm -f $(PDF)
