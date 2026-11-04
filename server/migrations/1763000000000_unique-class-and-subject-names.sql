-- Up Migration

-- "5-A" and "5-a" are the same class. Replaces the exact-match rule by one that ignores
-- letter case.
ALTER TABLE classes DROP CONSTRAINT classes_school_id_school_year_name_key;

CREATE UNIQUE INDEX classes_school_year_name_key ON classes (school_id, school_year, lower(name));

-- The same subject name can have several teachers in a class, but not the same teacher twice,
-- which would show students two identical choices.
CREATE UNIQUE INDEX subjects_class_name_teacher_key ON subjects (class_id, lower(name), teacher_id);

-- Down Migration

DROP INDEX subjects_class_name_teacher_key;

DROP INDEX classes_school_year_name_key;

ALTER TABLE classes
  ADD CONSTRAINT classes_school_id_school_year_name_key UNIQUE (school_id, school_year, name);
