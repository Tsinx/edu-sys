# Reproduce lectures 8-9, with one CPU thread and archived ordinal observations.
# Rscript scripts/build-statistical-analysis-factors.R [project-local R library]
args <- commandArgs(trailingOnly=TRUE)
if (length(args)) .libPaths(c(args[1], .libPaths()))
Sys.setenv(OMP_NUM_THREADS=1, OPENBLAS_NUM_THREADS=1, MKL_NUM_THREADS=1)
options(mc.cores=1, warn=1)
suppressPackageStartupMessages({library(jsonlite); library(psych); library(lavaan)})
dir.create('docs/course/statistical-analysis/data', recursive=TRUE, showWarnings=FALSE)
old <- fromJSON('packages/course-content/src/statistical-analysis/measurement-data.json')
keys <- c('R1','R2','R3','T1','T2','T3')
all <- as.data.frame(do.call(rbind,old$survey$rows$recoded)); names(all) <- keys
keep <- complete.cases(all); E <- all[keep,]; eids <- old$survey$rows$id[keep]
P <- cor(E)
Q <- psych::polychoric(E, correct=0, global=TRUE, smooth=FALSE, progress=FALSE)$rho
stopifnot(nrow(E)==221, min(eigen(Q, symmetric=TRUE)$values)>0)
fits <- lapply(1:3, function(k) suppressWarnings(psych::fa(Q, nfactors=k,
  n.obs=nrow(E), fm='minres', rotate=if(k==1)'none' else 'oblimin', residuals=TRUE)))
raw2 <- psych::fa(Q, nfactors=2, n.obs=nrow(E), fm='minres', rotate='none')
orth <- psych::fa(Q, nfactors=2, n.obs=nrow(E), fm='minres', rotate='varimax')
# Stable presentation convention: first factor aligns with R1-R3, positive signs.
align <- function(fit) {
  L <- unclass(fit$loadings)
  ord <- if(ncol(L)==2 && sum(abs(L[1:3,1]))<sum(abs(L[1:3,2]))) c(2,1) else seq_len(ncol(L))
  L <- L[,ord,drop=FALSE]
  signs <- sign(c(sum(L[1:3,1]), if(ncol(L)>1) sum(L[4:6,2]) else NULL))
  if(ncol(L)>2) signs <- rep(1,ncol(L))
  L <- sweep(L,2,signs,'*')
  Phi <- if(is.null(fit$Phi)) diag(ncol(L)) else fit$Phi[ord,ord,drop=FALSE]
  Phi <- Phi * outer(signs,signs)
  reproduced <- L %*% Phi %*% t(L)
  residual <- Q-reproduced; diag(residual) <- 0
  list(pattern=L, phi=Phi, structure=L%*%Phi, common=reproduced,
    h2=diag(reproduced), uniqueness=1-diag(reproduced), residual=residual,
    rms=sqrt(mean(residual[lower.tri(residual)]^2)), df=fit$dof,
    maxResidual=max(abs(residual)), converged=fit$converged)
}
ef <- lapply(fits,align)
reducedEigen <- function(r) {
  diag(r) <- 1-1/diag(solve(r))
  eigen(r, symmetric=TRUE, only.values=TRUE)$values
}
# Ordinal permutation parallel analysis: preserve each marginal distribution.
# Explicit SMC reduced-matrix eigenvalues, NOT PCA eigenvalues or a normal-data null.
set.seed(20261016)
null <- replicate(199, {
  shuffled <- as.data.frame(lapply(E, sample))
  r <- psych::polychoric(shuffled, correct=0, global=TRUE, smooth=FALSE, progress=FALSE)$rho
  reducedEigen(r)
})
parallel <- list(repetitions=199, seed=20261016,
  method='Independent within-column permutation; polychoric correlation; SMC diagonal; 95th percentile',
  observed=reducedEigen(Q), null95=apply(null,1,quantile,probs=.95),
  nullMean=rowMeans(null), trials=t(null))
km <- psych::KMO(P); bt <- psych::cortest.bartlett(P,n=nrow(E))

# A genuinely separate SIMULATED sample, not another subset of the 240 rows.
# Six old item wordings and response anchors are retained; S items are added for SEM.
set.seed(20261017)
n <- 400
R <- rnorm(n); T <- .42*R+sqrt(1-.42^2)*rnorm(n)
S <- .25*R+.48*T+sqrt(1-.25^2-.48^2-2*.25*.48*.42)*rnorm(n)
lambda <- c(.82,.78,.72,.80,.76,.74,.85,.80,.75)
latent <- cbind(R,R,R,T,T,T,S,S,S)
y <- sweep(latent,2,lambda,'*') + sweep(matrix(rnorm(n*9),n,9),2,sqrt(1-lambda^2),'*')
# A small unmodeled cross-loading provides a realistic local-misfit discussion.
y[,5] <- .14*R+.74*T+sqrt(1-.14^2-.74^2-2*.14*.74*.42)*rnorm(n)
C <- as.data.frame(apply(y,2,function(v) as.integer(cut(v,c(-Inf,-1,-.35,.35,1.05,Inf)))))
names(C) <- c(keys,'S1','S2','S3')
responses <- C; responses$T3 <- 6-C$T3
archive <- cbind(id=sprintf('C%03d',seq_len(n)),responses)
write.csv(archive,'docs/course/statistical-analysis/data/factor-confirmation.csv',row.names=FALSE,fileEncoding='UTF-8')
two <- 'R =~ R1 + R2 + R3
        T =~ T1 + T2 + T3'
one <- 'G =~ R1 + R2 + R3 + T1 + T2 + T3'
cfa2 <- cfa(two, data=C, ordered=keys, estimator='WLSMV', std.lv=TRUE)
cfa1 <- cfa(one, data=C, ordered=keys, estimator='WLSMV', std.lv=TRUE)
fitInfo <- function(fit) {
  stopifnot(lavInspect(fit,'converged'), lavInspect(fit,'post.check'))
  fm <- fitMeasures(fit,c('chisq.scaled','df.scaled','pvalue.scaled', 'cfi.scaled',
    'tli.scaled','rmsea.scaled','rmsea.ci.lower.scaled','rmsea.ci.upper.scaled','srmr'))
  std <- standardizedSolution(fit, ci=TRUE)
  obs <- lavInspect(fit,'sampstat')$cov
  implied <- cov2cor(fitted(fit)$cov)
  residual <- obs-implied
  mi <- modindices(fit,sort.=TRUE); mi <- mi[mi$op %in% c('=~','~~'),]
  list(n=lavInspect(fit,'nobs'), freeParameters=lavInspect(fit,'npar'), converged=TRUE, admissible=TRUE,
    measures=as.list(fm), parameters=parameterEstimates(fit,ci=TRUE,standardized=TRUE),
    standardized=std, observed=obs, implied=implied, residual=residual,
    maxResidual=max(abs(residual[lower.tri(residual)])),
    phi=lavInspect(fit,'cor.lv'), modification=head(mi,5),
    theta=lavInspect(fit,'theta'), loadings=lavInspect(fit,'std')$lambda)
}
semModel <- paste(two, 'S =~ S1 + S2 + S3
  T ~ a*R
  S ~ b*T + c*R
  indirect := a*b
  total := c+a*b',sep='\n')
# Marker-item scaling for all three factors. Direct/indirect effects share that scale.
semFit <- sem(semModel,data=C,ordered=names(C),estimator='WLSMV')
reverseModel <- paste(two,'S =~ S1 + S2 + S3
  R ~ T
  S ~ R + T',sep='\n')
reverseFit <- sem(reverseModel,data=C,ordered=names(C),estimator='WLSMV')
out <- list(
  provenance=list(seedEFA=20261011,seedParallel=20261016,seedConfirmation=20261017,
    source='Teaching simulation, not a validated instrument or a real survey',
    r=R.version.string, packages=as.list(sapply(c('psych','lavaan','GPArotation','jsonlite'),function(p)as.character(packageVersion(p)))),
    thresholds=c(-1,-.35,.35,1.05), generatorLoadings=lambda,
    generatorPaths=list(a=.42,b=.48,c=.25), generatorT2=list(R=.14,T=.74),
    originalDataMD5=unname(tools::md5sum('packages/course-content/src/statistical-analysis/measurement-data.json')),
    missingRule='EFA: listwise six-item complete cases, 221/240; CFA/SEM: new complete ordinal sample, 400/400'),
  efa=list(ids=eids, rows=as.matrix(E), keys=keys, pearson=P, polychoric=Q,
    kmo=km$MSA, msa=km$MSAi, bartlett=bt, eigen=eigen(Q)$values,
    parallel=parallel, one=ef[[1]], two=ef[[2]], three=ef[[3]],
    unrotated=align(raw2), orthogonal=align(orth)),
  confirmation=list(ids=archive$id, responses=as.matrix(responses), recoded=as.matrix(C),
    keys=names(C), one=fitInfo(cfa1), two=fitInfo(cfa2)),
  sem=list(model=semModel, pathCovariance=vcov(semFit)[c('a','b','c'),c('a','b','c')],
    fit=fitInfo(semFit), reverse=fitInfo(reverseFit)))
write_json(out,'packages/course-content/src/statistical-analysis/factor-data.json',
  pretty=TRUE, auto_unbox=TRUE, digits=14, matrix='rowmajor', na='null')
writeLines(sub('[[:space:]]+$','',capture.output(sessionInfo())),
  'docs/course/statistical-analysis/data/factor-session-info.txt')
cat(sprintf('EFA %d complete rows, two-factor RMS %.4f, phi %.4f\n',nrow(E),ef[[2]]$rms,ef[[2]]$phi[1,2]))
print(parallel$observed); print(parallel$null95)
print(fitMeasures(cfa2,c('chisq.scaled','df.scaled','pvalue.scaled','cfi.scaled','rmsea.scaled','srmr')))
print(subset(parameterEstimates(semFit,ci=TRUE),op %in% c('~',':=')))
