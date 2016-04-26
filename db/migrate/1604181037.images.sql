
CREATE TABLE photos (
  sid          INTEGER  PRIMARY KEY REFERENCES images ON DELETE CASCADE,
  item_id      INTEGER  NOT NULL REFERENCES items ON DELETE CASCADE,
  path         TEXT     NOT NULL,
  protocol     TEXT     NOT NULL DEFAULT 'file',
  mimetype     TEXT     NOT NULL,
  checksum     TEXT     NOT NULL,
  orientation  INTEGER  NOT NULL DEFAULT 1,
  exif
) WITHOUT ROWID;


CREATE TABLE selections (
  sid       INTEGER  PRIMARY KEY REFERENCES images ON DELETE CASCADE,
  photo_id  INTEGER  NOT NULL REFERENCES photos ON DELETE CASCADE,
  quality   TEXT     NOT NULL DEFAULT 'default' REFERENCES image_qualities,
  x         NUMERIC  NOT NULL DEFAULT 0,
  y         NUMERIC  NOT NULL DEFAULT 0,
  pct       BOOLEAN  NOT NULL DEFAULT FALSE
) WITHOUT ROWID;


CREATE TABLE image_scales (
  sid     INTEGER  PRIMARY KEY REFERENCES selections ON DELETE CASCADE,
  x       NUMERIC  NOT NULL DEFAULT 0,
  y       NUMERIC  NOT NULL DEFAULT 0,
  factor  NUMERIC  NOT NULL,
  fit     BOOLEAN  NOT NULL DEFAULT FALSE
) WITHOUT ROWID;

CREATE TABLE image_rotations (
  sid     INTEGER  PRIMARY KEY REFERENCES selections ON DELETE CASCADE,
  angle   NUMERIC  NOT NULL DEFAULT 0,
  mirror  BOOLEAN  NOT NULL DEFAULT FALSE
) WITHOUT ROWID;


CREATE TABLE image_qualities (
  quality  TEXT  NOT NULL PRIMARY KEY
) WITHOUT ROWID;

INSERT INTO image_qualities (quality) VALUES
  ('default'), ('color'), ('gray'), ('bitonal');
