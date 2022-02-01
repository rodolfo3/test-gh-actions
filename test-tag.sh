set -e

TAG_PREFIX=release/`date +%Y-%m-%d`

function buildtag()
{
  TAG=$TAG_PREFIX
  if [ `git tag -l $TAG | wc -l` == "0" ]
  then
    echo "$TAG"
    return
  fi
  for i in {1..9}
  do
    TAG="${TAG_PREFIX}-${i}"
    if [ `git tag -l $TAG | wc -l` == "0" ]
    then
      echo "$TAG"
      return
    fi
  done
}

echo $(buildtag)
